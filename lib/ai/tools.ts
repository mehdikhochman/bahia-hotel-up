import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { computePricing } from "@/lib/pricing";
import { formatXOF } from "@/lib/utils";
import { nextSaturday } from "@/lib/utils";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format YYYY-MM-DD")
  .describe("Date au format ISO YYYY-MM-DD");

/**
 * All tools below are intentionally pure read functions except for
 * captureLeadEmail (which writes a flag on the session). They never mutate
 * bookings — actual booking creation goes through the protected wizard.
 */
export function buildTools(sessionId: string) {
  return {
    searchAvailableRooms: tool({
      description:
        "Cherche les chambres et villas disponibles pour une période donnée. Renvoie jusqu'à 5 options triées par type puis prix, avec leur disponibilité (totalUnits - réservations qui se chevauchent). Utilise-le DÈS qu'un visiteur mentionne des dates ou un nombre de voyageurs.",
      inputSchema: z.object({
        checkIn: isoDate,
        checkOut: isoDate,
        guests: z.number().int().min(1).max(20).describe("Nombre de voyageurs"),
        type: z
          .enum(["VILLA", "ROOM"])
          .optional()
          .describe("Filtrer par type d'hébergement"),
        maxPricePerNight: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Plafond de prix par nuit en XOF"),
      }),
      execute: async ({ checkIn, checkOut, guests, type, maxPricePerNight }) => {
        const a = new Date(checkIn);
        const b = new Date(checkOut);
        if (b <= a) {
          return { error: "La date de départ doit être après la date d'arrivée." };
        }
        const nights = Math.round((b.getTime() - a.getTime()) / 86_400_000);

        const rooms = await prisma.room.findMany({
          where: {
            isActive: true,
            capacity: { gte: guests },
            ...(type ? { type } : {}),
            ...(maxPricePerNight
              ? { pricePerNight: { lte: maxPricePerNight } }
              : {}),
          },
          orderBy: [{ type: "asc" }, { pricePerNight: "desc" }],
        });

        const result = await Promise.all(
          rooms.map(async (r) => {
            const overlapping = await prisma.booking.count({
              where: {
                roomId: r.id,
                status: {
                  in: ["PENDING_PAYMENT", "AWAITING_VERIFICATION", "CONFIRMED"],
                },
                AND: [{ checkIn: { lt: b } }, { checkOut: { gt: a } }],
              },
            });
            const remaining = Math.max(0, r.totalUnits - overlapping);
            const pricing = computePricing({
              pricePerNight: r.pricePerNight,
              nights,
              guests,
            });
            return {
              id: r.id,
              slug: r.slug,
              name: r.name,
              type: r.type,
              tagline: r.tagline,
              description: r.description,
              imageUrl: r.imageUrl,
              capacity: r.capacity,
              surfaceSqm: r.surfaceSqm,
              amenities: r.amenities,
              pricePerNight: r.pricePerNight,
              pricePerNightFormatted: formatXOF(r.pricePerNight),
              totalForStay: pricing.total,
              totalForStayFormatted: formatXOF(pricing.total),
              available: remaining > 0,
              unitsRemaining: remaining,
              totalUnits: r.totalUnits,
            };
          })
        );

        return {
          checkIn,
          checkOut,
          nights,
          guests,
          rooms: result.slice(0, 5),
        };
      },
    }),

    getRoomDetails: tool({
      description:
        "Détails complets d'une chambre par son id ou son slug. À utiliser si le visiteur demande plus d'informations sur une chambre précise.",
      inputSchema: z.object({
        idOrSlug: z.string().describe("ID ou slug de la chambre"),
      }),
      execute: async ({ idOrSlug }) => {
        const room = await prisma.room.findFirst({
          where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
        });
        if (!room) return { error: "Chambre introuvable." };
        return {
          id: room.id,
          slug: room.slug,
          name: room.name,
          type: room.type,
          tagline: room.tagline,
          description: room.description,
          imageUrl: room.imageUrl,
          capacity: room.capacity,
          surfaceSqm: room.surfaceSqm,
          amenities: room.amenities,
          pricePerNight: room.pricePerNight,
          pricePerNightFormatted: formatXOF(room.pricePerNight),
          totalUnits: room.totalUnits,
        };
      },
    }),

    computeStayPrice: tool({
      description:
        "Calcule le prix exact d'un séjour (sous-total, TVA 18%, taxe de séjour, total). À utiliser DÈS qu'on parle d'argent.",
      inputSchema: z.object({
        roomIdOrSlug: z.string(),
        checkIn: isoDate,
        checkOut: isoDate,
        guests: z.number().int().min(1).max(20),
      }),
      execute: async ({ roomIdOrSlug, checkIn, checkOut, guests }) => {
        const room = await prisma.room.findFirst({
          where: { OR: [{ id: roomIdOrSlug }, { slug: roomIdOrSlug }] },
          select: { name: true, pricePerNight: true },
        });
        if (!room) return { error: "Chambre introuvable." };
        const a = new Date(checkIn);
        const b = new Date(checkOut);
        const nights = Math.round((b.getTime() - a.getTime()) / 86_400_000);
        if (nights <= 0) return { error: "Durée invalide." };
        const p = computePricing({
          pricePerNight: room.pricePerNight,
          nights,
          guests,
        });
        return {
          roomName: room.name,
          nights,
          guests,
          subtotal: p.subtotal,
          subtotalFormatted: formatXOF(p.subtotal),
          vat: p.vat,
          vatFormatted: formatXOF(p.vat),
          cityTax: p.cityTax,
          cityTaxFormatted: formatXOF(p.cityTax),
          total: p.total,
          totalFormatted: formatXOF(p.total),
          message: `${nights} nuit${nights > 1 ? "s" : ""} × ${formatXOF(
            room.pricePerNight
          )} = ${formatXOF(p.subtotal)}. Avec TVA et taxe de séjour : ${formatXOF(
            p.total
          )} au total.`,
        };
      },
    }),

    getNextKaraokeNight: tool({
      description:
        "Date du prochain samedi karaoké et nombre de tables déjà réservées.",
      inputSchema: z.object({}),
      execute: async () => {
        const date = nextSaturday(new Date());
        const dateISO = date.toISOString().split("T")[0];
        const reservations = await prisma.karaokeReservation.findMany({
          where: { date, status: { not: "CANCELLED" } },
          select: { partySize: true },
        });
        const totalGuests = reservations.reduce(
          (s, r) => s + r.partySize,
          0
        );
        return {
          date: dateISO,
          dateLabel: date.toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          startTime: "20h00",
          endTime: "03h00",
          reservationsCount: reservations.length,
          expectedAttendance: totalGuests,
          venue: "Bar lounge front de mer",
          dressCode: "Tropical chic",
          bookingUrl: "/#karaoke",
        };
      },
    }),

    getHotelInfo: tool({
      description:
        "Renvoie des informations factuelles sur l'hôtel selon un sujet (transport, food, spa, plage, kids, pets, checkin, payment, location).",
      inputSchema: z.object({
        topic: z.enum([
          "transport",
          "food",
          "spa",
          "beach",
          "kids",
          "pets",
          "checkin",
          "payment",
          "location",
          "activities",
        ]),
      }),
      execute: async ({ topic }) => {
        const facts: Record<string, string> = {
          transport:
            "Bahia est à 80 km d'Abidjan, environ 1h30 de route via la voie expresse Grand-Bassam puis Assinie. Transfert privé organisable sur demande (~30 000 FCFA aller). Parking gratuit sur place.",
          food: "Restaurant ouvert midi et soir. Cuisine ivoirienne revisitée : poissons du jour grillés, attiéké de la lagune, foutou, plats internationaux. Petits-déjeuners inclus dans toute réservation.",
          spa: "Spa tropical : massages au beurre de karité, soins au cacao, gommages au sel marin. Réservation à l'arrivée. Cabines en pleine nature.",
          beach:
            "200 mètres de plage privée. Transats, parasols, douches. Maître-nageur en journée. Eau calme côté lagune, vagues côté océan.",
          kids: "Famille bienvenue. Lits bébé gratuits sur demande. Pas de kids club dédié mais piscine surveillée et plage sécurisée.",
          pets: "Animaux acceptés dans les villas uniquement, avec accord préalable. Supplément de 15 000 FCFA / séjour pour le ménage approfondi.",
          checkin:
            "Check-in dès 14h, check-out à 12h. Réception ouverte 24/7. Une pièce d'identité (CNI, passeport, carte consulaire ou carte de séjour) sera demandée à la réservation conformément à la loi ivoirienne.",
          payment:
            "Paiement uniquement via Wave Money à la réservation. Une référence unique est générée et le voyageur reçoit un lien de paiement direct. Confirmation manuelle sous 30 min.",
          location:
            "Assinie Terminal, péninsule d'Assinie, région du Sud-Comoé. Coordonnées GPS approximatives : 5.135°N, 3.276°W. Au bout de la péninsule, là où la lagune Aby rejoint l'Atlantique.",
          activities:
            "Sortie pirogue à l'aube vers les villages éburnéens. Apéro coucher de soleil sur la plage. Karaoké tous les samedis 20h-03h. Excursion vers Bassam (50 min). Pêche en mer (sur demande).",
        };
        return { topic, info: facts[topic] ?? "Information non disponible." };
      },
    }),

    prefillBooking: tool({
      description:
        "Génère un lien de réservation pré-rempli avec les dates, la chambre et le nombre de voyageurs. À appeler quand le visiteur dit explicitement qu'il veut réserver ou confirmer.",
      inputSchema: z.object({
        roomIdOrSlug: z.string(),
        checkIn: isoDate,
        checkOut: isoDate,
        guests: z.number().int().min(1).max(20),
      }),
      execute: async ({ roomIdOrSlug, checkIn, checkOut, guests }) => {
        const room = await prisma.room.findFirst({
          where: { OR: [{ id: roomIdOrSlug }, { slug: roomIdOrSlug }] },
          select: { id: true, name: true },
        });
        if (!room) return { error: "Chambre introuvable." };
        const params = new URLSearchParams({
          openBooking: "1",
          room: room.id,
          checkIn,
          checkOut,
          guests: String(guests),
        });
        return {
          roomName: room.name,
          checkIn,
          checkOut,
          guests,
          deepLink: `/?${params.toString()}#hebergements`,
          message:
            "Lien généré. Le visiteur peut cliquer pour ouvrir le formulaire pré-rempli.",
        };
      },
    }),

    prepareBooking: tool({
      description:
        "Prépare une réservation COMPLÈTE à finaliser directement dans le chat. À n'appeler QUE lorsque tu as recueilli TOUTES ces informations en conversation : la chambre/villa choisie, les dates d'arrivée et de départ, le nombre de voyageurs, ET le nom complet, l'email, le numéro de téléphone et la nationalité du voyageur principal. L'outil vérifie la disponibilité en temps réel, calcule le prix exact (TVA + taxe de séjour) et affiche une carte interactive où le visiteur téléverse sa pièce d'identité (recto-verso), accepte le traitement légal des données et confirme. Ne demande JAMAIS les photos de pièce d'identité par message — la carte s'en charge. N'appelle pas cet outil s'il te manque une seule de ces informations : pose d'abord la question manquante.",
      inputSchema: z.object({
        roomIdOrSlug: z.string().describe("ID ou slug de l'hébergement choisi"),
        checkIn: isoDate,
        checkOut: isoDate,
        guests: z.number().int().min(1).max(12).describe("Nombre de voyageurs"),
        fullName: z
          .string()
          .min(2)
          .describe("Nom complet tel qu'inscrit sur la pièce d'identité"),
        email: z.string().email().describe("Email du voyageur"),
        phone: z
          .string()
          .min(6)
          .describe("Numéro de téléphone avec indicatif, ex. +225 07 00 00 00 00"),
        nationality: z.string().min(2).describe("Nationalité du voyageur"),
      }),
      execute: async ({
        roomIdOrSlug,
        checkIn,
        checkOut,
        guests,
        fullName,
        email,
        phone,
        nationality,
      }) => {
        const room = await prisma.room.findFirst({
          where: { OR: [{ id: roomIdOrSlug }, { slug: roomIdOrSlug }] },
        });
        if (!room || !room.isActive) {
          return { ok: false, error: "Hébergement introuvable ou indisponible." };
        }

        const a = new Date(checkIn);
        const b = new Date(checkOut);
        const nights = Math.round((b.getTime() - a.getTime()) / 86_400_000);
        if (nights <= 0) {
          return { ok: false, error: "La date de départ doit suivre l'arrivée." };
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (a < today) {
          return {
            ok: false,
            error: "La date d'arrivée ne peut pas être dans le passé.",
          };
        }
        if (guests > room.capacity) {
          return {
            ok: false,
            error: `${room.name} accueille jusqu'à ${room.capacity} voyageurs.`,
          };
        }

        // Capacity-aware availability check — block only if every requested
        // night is already saturated (totalUnits concurrent bookings).
        const overlapping = await prisma.booking.findMany({
          where: {
            roomId: room.id,
            status: {
              in: ["PENDING_PAYMENT", "AWAITING_VERIFICATION", "CONFIRMED"],
            },
            AND: [{ checkIn: { lt: b } }, { checkOut: { gt: a } }],
          },
          select: { checkIn: true, checkOut: true },
        });
        const DAY = 86_400_000;
        for (let t = a.getTime(); t < b.getTime(); t += DAY) {
          const day = new Date(t);
          const load = overlapping.filter(
            (x) => x.checkIn <= day && x.checkOut > day
          ).length;
          if (load >= room.totalUnits) {
            return {
              ok: false,
              error: `Plus aucune unité disponible le ${
                day.toISOString().split("T")[0]
              } pour ${room.name}.`,
            };
          }
        }

        const p = computePricing({
          pricePerNight: room.pricePerNight,
          nights,
          guests,
        });

        // Best-effort: stash the contact details on the session so staff can
        // follow up even if the visitor abandons before paying.
        try {
          await prisma.chatSession.update({
            where: { id: sessionId },
            data: { guestName: fullName, guestEmail: email, guestPhone: phone },
          });
        } catch {
          // non-blocking
        }

        return {
          ok: true,
          booking: {
            roomId: room.id,
            roomName: room.name,
            roomType: room.type,
            imageUrl: room.imageUrl,
            checkIn,
            checkOut,
            nights,
            guests,
            fullName,
            email,
            phone,
            nationality,
            pricePerNight: room.pricePerNight,
            pricePerNightFormatted: formatXOF(room.pricePerNight),
            subtotal: p.subtotal,
            subtotalFormatted: formatXOF(p.subtotal),
            vat: p.vat,
            vatFormatted: formatXOF(p.vat),
            cityTax: p.cityTax,
            cityTaxFormatted: formatXOF(p.cityTax),
            total: p.total,
            totalFormatted: formatXOF(p.total),
          },
          message:
            "Récapitulatif prêt et hébergement disponible. Une carte interactive s'affiche : invite le visiteur à y téléverser sa pièce d'identité (recto-verso), à accepter le traitement légal des données et à confirmer pour obtenir le QR de paiement Wave.",
        };
      },
    }),

    captureLeadEmail: tool({
      description:
        "Enregistre l'email (et éventuellement le nom/téléphone) du visiteur s'il le fournit. À appeler quand le visiteur partage ses coordonnées.",
      inputSchema: z.object({
        email: z.string().email(),
        name: z.string().optional(),
        phone: z.string().optional(),
        interest: z
          .string()
          .max(200)
          .optional()
          .describe("Résumé bref de ce qui intéresse le visiteur"),
      }),
      execute: async ({ email, name, phone, interest }) => {
        await prisma.chatSession.update({
          where: { id: sessionId },
          data: {
            guestEmail: email,
            guestName: name,
            guestPhone: phone,
            summary: interest,
          },
        });
        return {
          ok: true,
          message:
            "Email enregistré. Le staff Bahia pourra vous recontacter si besoin.",
        };
      },
    }),
  };
}

export type IyaToolName = keyof ReturnType<typeof buildTools>;
