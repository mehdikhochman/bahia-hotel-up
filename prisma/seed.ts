import { PrismaClient, RoomType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const rooms = [
  {
    slug: "villa-lagune",
    type: RoomType.VILLA,
    name: "Villa Lagune",
    tagline: "Vue sur la lagune des Éburnéens",
    description:
      "Villa intimiste posée sur la lagune. Bois flottés, lin écru et palmiers tressés — la quintessence d'Assinie.",
    pricePerNight: 180_000,
    capacity: 4,
    surfaceSqm: 120,
    imageUrl:
      "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1600&q=80",
    amenities: [
      "AC",
      "Wi-Fi",
      "Vue lagune",
      "Piscine privée",
      "Cuisine équipée",
      "Terrasse",
    ],
  },
  {
    slug: "villa-ocean",
    type: RoomType.VILLA,
    name: "Villa Océan",
    tagline: "Pieds dans le sable, regard sur l'Atlantique",
    description:
      "Notre signature. Une villa front de mer où l'océan vient murmurer jusqu'à votre terrasse.",
    pricePerNight: 240_000,
    capacity: 6,
    surfaceSqm: 180,
    imageUrl:
      "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1600&q=80",
    amenities: [
      "AC",
      "Wi-Fi",
      "Vue océan",
      "Plage privée",
      "Jacuzzi",
      "Service majordome",
    ],
  },
  {
    slug: "suite-baobab",
    type: RoomType.ROOM,
    name: "Suite Baobab",
    tagline: "Élégance tropicale, calme absolu",
    description:
      "Suite raffinée nichée dans le jardin tropical. Réveils sucrés au chant des oiseaux.",
    pricePerNight: 75_000,
    capacity: 2,
    surfaceSqm: 42,
    imageUrl:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=80",
    amenities: ["AC", "Wi-Fi", "Vue jardin", "Lit king-size", "Salle de bain marbre"],
  },
  {
    slug: "chambre-coco",
    type: RoomType.ROOM,
    name: "Chambre Coco",
    tagline: "Cocon ouvert sur l'océan",
    description:
      "Chambre lumineuse face à l'océan. Le bruit des vagues comme veilleuse naturelle.",
    pricePerNight: 95_000,
    capacity: 2,
    surfaceSqm: 38,
    imageUrl:
      "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1600&q=80",
    amenities: ["AC", "Wi-Fi", "Vue océan", "Balcon", "Mini-bar"],
  },
];

async function main() {
  for (const r of rooms) {
    await prisma.room.upsert({
      where: { slug: r.slug },
      update: r,
      create: r,
    });
  }
  // eslint-disable-next-line no-console
  console.log(`✓ Seeded ${rooms.length} rooms`);

  // Bootstrap an admin user — credentials read from env, never hardcoded.
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const fullName = process.env.SEED_ADMIN_NAME || "Bahia Manager";

  if (email && password) {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.adminUser.upsert({
      where: { email: email.toLowerCase() },
      update: { fullName, isActive: true },
      create: {
        email: email.toLowerCase(),
        fullName,
        passwordHash,
        role: "MANAGER",
      },
    });
    // eslint-disable-next-line no-console
    console.log(`✓ Admin ready: ${email}`);
  } else {
    // eslint-disable-next-line no-console
    console.log(
      "ⓘ Skipped admin seed (set SEED_ADMIN_EMAIL & SEED_ADMIN_PASSWORD)"
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
