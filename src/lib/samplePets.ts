import { useAppStore, type PetCard } from "@/lib/store";

/**
 * A curated, fictional PetDex for visualizing the collection UI. Uses the
 * pre-rendered transparent cutouts in /public/demo/cutouts so cards show
 * proper stickers on their mystical backdrops. Loaded on demand from
 * Settings; replaces the current local collection.
 */
type Sample = Omit<PetCard, "id" | "createdAt">;

const SAMPLES: Sample[] = [
  {
    serialNumber: 8, customName: "Sir Reginald Woofsworth", species: "dog", breed: "Pembroke Corgi",
    rarity: "legendary", imageUrl: "/demo/dog.jpg", cutoutUrl: "/demo/cutouts/dog.png",
    lat: 14.5995, lng: 120.9842, venueName: null, level: 2, candy: 4,
    stats: { chonkiness: 88, friendliness: 91, energy: 47 }, hatched: true, backdrop: 0,
  },
  {
    serialNumber: 7, customName: "Duchess Mittens", species: "cat", breed: "Tabby",
    rarity: "mythic", imageUrl: "/demo/cat.jpg", cutoutUrl: "/demo/cutouts/cat.png",
    lat: 14.55, lng: 121.02, venueName: "Pet Summit Philippines", level: 3, candy: 9,
    stats: { chonkiness: 64, friendliness: 78, energy: 82 }, hatched: true, backdrop: 2,
  },
  {
    serialNumber: 6, customName: "Captain Featherbeard", species: "bird", breed: "Scarlet Macaw",
    rarity: "epic", imageUrl: "/demo/bird.jpg", cutoutUrl: "/demo/cutouts/bird.png",
    lat: 14.61, lng: 120.99, venueName: null, level: 1, candy: 1,
    stats: { chonkiness: 32, friendliness: 70, energy: 95 }, hatched: true, backdrop: 3,
  },
  {
    serialNumber: 5, customName: "Sir Hops-a-Lot", species: "rabbit", breed: "Cottontail",
    rarity: "rare", imageUrl: "/demo/rabbit.jpg", cutoutUrl: "/demo/cutouts/rabbit.png",
    lat: 14.59, lng: 121.01, venueName: null, level: 2, candy: 4,
    stats: { chonkiness: 71, friendliness: 66, energy: 58 }, hatched: true, backdrop: 1,
  },
  {
    serialNumber: 4, customName: "Zoomie McFluff", species: "dog", breed: "Corgi",
    rarity: "rare", imageUrl: "/demo/dog2.jpg", cutoutUrl: "/demo/cutouts/dog2.png",
    lat: 14.58, lng: 121.0, venueName: null, level: 1, candy: 1,
    stats: { chonkiness: 55, friendliness: 84, energy: 88 }, hatched: true, backdrop: 3,
  },
  {
    serialNumber: 3, customName: "Biscuit Purrington", species: "cat", breed: "Tabby",
    rarity: "uncommon", imageUrl: "/demo/cat.jpg", cutoutUrl: "/demo/cutouts/cat.png",
    lat: 14.6, lng: 120.98, venueName: null, level: 1, candy: 1,
    stats: { chonkiness: 80, friendliness: 60, energy: 40 }, hatched: true, backdrop: 1,
  },
  {
    serialNumber: 2, customName: "Mochi Biscuit", species: "dog", breed: "Pembroke Corgi",
    rarity: "common", imageUrl: "/demo/dog.jpg", cutoutUrl: "/demo/cutouts/dog.png",
    lat: 14.57, lng: 121.03, venueName: null, level: 1, candy: 1,
    stats: { chonkiness: 45, friendliness: 52, energy: 38 }, hatched: true, backdrop: 3,
  },
  {
    // still hatching — showcases the egg state before rarity is revealed
    serialNumber: 1, customName: "Mystery Egg", species: "rabbit", breed: null,
    rarity: "common", imageUrl: "/demo/rabbit.jpg", cutoutUrl: null,
    lat: 14.6, lng: 121.0, venueName: null, level: 1, candy: 1,
    stats: { chonkiness: 50, friendliness: 50, energy: 50 }, hatched: false, backdrop: 0,
  },
];

/** Replace the local PetDex with the fictional showcase set. */
export function loadSamplePetDex() {
  const now = Date.now();
  const cards: PetCard[] = SAMPLES.map((s, i) => ({
    ...s,
    id: `sample-${s.serialNumber}`,
    createdAt: new Date(now - i * 86_400_000).toISOString(), // spread over recent days
  }));
  useAppStore.getState().setCollection(cards);
}
