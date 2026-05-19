import type Phaser from "phaser";
import type { AttackAction, CharacterId, DefenseAction, Fighter } from "../simulation/types";

export const CHARACTER_MOTIONS = [
  "weakAttack",
  "strongAttack",
  "special",
  "block",
  "dodge",
  "counter",
  "hurt",
  "grandCounter",
] as const;

export type CharacterMotion = (typeof CHARACTER_MOTIONS)[number];

export const CHARACTER_FRAME_COUNT = 6;

export type SpriteAtlasVariant = "base" | "awakened";

export interface SpriteBoxMetadata {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SpriteFrameMetadata {
  x: number;
  y: number;
  w: number;
  h: number;
  pivotX: number;
  pivotY: number;
  offsetX: number;
  offsetY: number;
  duration: number;
  hitboxes: SpriteBoxMetadata[];
  hurtboxes: SpriteBoxMetadata[];
}

export interface SpriteAnimationMetadata {
  loop: boolean;
  frames: string[];
}

export interface SpriteAtlasMetadata {
  image: {
    name: string;
    width: number;
    height: number;
  } | null;
  frames: Record<string, SpriteFrameMetadata>;
  animations: Record<string, SpriteAnimationMetadata>;
}

export interface SpriteAtlasDefinition {
  fighterId: CharacterId;
  variant: SpriteAtlasVariant;
  textureKey: string;
  metadataKey: string;
  imagePath: string;
  metadataPath: string;
}

export interface SpriteAtlasRuntime {
  definition: SpriteAtlasDefinition;
  metadata: SpriteAtlasMetadata;
}

export const SPRITE_ATLAS_DEFINITIONS: SpriteAtlasDefinition[] = [
  {
    fighterId: "golden-soul-maiden",
    variant: "base",
    textureKey: "atlas-golden-soul-maiden",
    metadataKey: "atlas-meta-golden-soul-maiden",
    imagePath: "/assets/sprite-atlases/golden-soul-maiden.png",
    metadataPath: "/assets/sprite-atlases/golden-soul-maiden.json",
  },
  {
    fighterId: "golden-soul-maiden",
    variant: "awakened",
    textureKey: "atlas-golden-soul-maiden-awakened",
    metadataKey: "atlas-meta-golden-soul-maiden-awakened",
    imagePath: "/assets/sprite-atlases/golden-soul-maiden-awakened.png",
    metadataPath: "/assets/sprite-atlases/golden-soul-maiden-awakened.json",
  },
  {
    fighterId: "seal-judge",
    variant: "awakened",
    textureKey: "atlas-seal-judge-awakened",
    metadataKey: "atlas-meta-seal-judge-awakened",
    imagePath: "/assets/sprite-atlases/seal-judge-awakened.png",
    metadataPath: "/assets/sprite-atlases/seal-judge-awakened.json",
  },
  {
    fighterId: "seahorse-overlord",
    variant: "awakened",
    textureKey: "atlas-seahorse-overlord-awakened",
    metadataKey: "atlas-meta-seahorse-overlord-awakened",
    imagePath: "/assets/sprite-atlases/seahorse-overlord-awakened.png",
    metadataPath: "/assets/sprite-atlases/seahorse-overlord-awakened.json",
  },
  {
    fighterId: "longing-soul",
    variant: "base",
    textureKey: "atlas-longing-soul",
    metadataKey: "atlas-meta-longing-soul",
    imagePath: "/assets/sprite-atlases/longing-soul.png",
    metadataPath: "/assets/sprite-atlases/longing-soul.json",
  },
  {
    fighterId: "longing-soul",
    variant: "awakened",
    textureKey: "atlas-longing-soul-awakened",
    metadataKey: "atlas-meta-longing-soul-awakened",
    imagePath: "/assets/sprite-atlases/longing-soul-awakened.png",
    metadataPath: "/assets/sprite-atlases/longing-soul-awakened.json",
  },
  {
    fighterId: "emuji",
    variant: "awakened",
    textureKey: "atlas-emuji-awakened",
    metadataKey: "atlas-meta-emuji-awakened",
    imagePath: "/assets/sprite-atlases/emuji-awakened.png",
    metadataPath: "/assets/sprite-atlases/emuji-awakened.json",
  },
  {
    fighterId: "truth-tracker",
    variant: "awakened",
    textureKey: "atlas-truth-tracker-awakened",
    metadataKey: "atlas-meta-truth-tracker-awakened",
    imagePath: "/assets/sprite-atlases/truth-tracker-awakened.png",
    metadataPath: "/assets/sprite-atlases/truth-tracker-awakened.json",
  },
];

const ATLAS_ANIMATION_BY_MOTION: Record<CharacterMotion, string> = {
  weakAttack: "s_attack",
  strongAttack: "l_attack",
  special: "sp_attack",
  block: "guard",
  dodge: "dodge",
  counter: "counter",
  hurt: "hit",
  grandCounter: "counter",
};

export function getAnimationFrameKey(
  fighterId: Fighter["id"],
  motion: CharacterMotion,
  frameIndex: number,
) {
  return `anim-${fighterId}-${motion}-${frameIndex}`;
}

export function getAnimationFramePath(
  fighterId: Fighter["id"],
  motion: CharacterMotion,
  frameIndex: number,
) {
  return `/assets/sprites/${fighterId}/${motion}/${frameIndex.toString().padStart(2, "0")}.png`;
}

export function getSpriteAtlasDefinition(fighterId: CharacterId, awakened: boolean) {
  const variant: SpriteAtlasVariant = awakened ? "awakened" : "base";
  return SPRITE_ATLAS_DEFINITIONS.find((definition) => definition.fighterId === fighterId && definition.variant === variant);
}

export function getSpriteAtlasFrameKey(definition: SpriteAtlasDefinition, frameName: string) {
  return `${definition.textureKey}-${frameName}`;
}

export function getAtlasAnimationName(motion: CharacterMotion) {
  return ATLAS_ANIMATION_BY_MOTION[motion];
}

export function getSpriteAtlasRuntime(scene: Phaser.Scene, fighterId: CharacterId, awakened: boolean): SpriteAtlasRuntime | null {
  const definition = getSpriteAtlasDefinition(fighterId, awakened);
  if (!definition) {
    return null;
  }

  const metadata = scene.cache.json.get(definition.metadataKey) as SpriteAtlasMetadata | undefined;
  if (!metadata) {
    return null;
  }

  return { definition, metadata };
}

export function getAtlasFrameMetadata(runtime: SpriteAtlasRuntime, animationName: string, frameIndex: number) {
  const animation = runtime.metadata.animations[animationName];
  const frameName = animation?.frames[frameIndex];
  if (!frameName) {
    return null;
  }

  const frame = runtime.metadata.frames[frameName];
  if (!frame) {
    return null;
  }

  return { frameName, frame, animation };
}

export function motionForAttack(action: AttackAction): CharacterMotion | null {
  if (action === "WeakAttack") {
    return "weakAttack";
  }
  if (action === "StrongAttack") {
    return "strongAttack";
  }
  if (action === "Special") {
    return "special";
  }
  return null;
}

export function motionForDefense(action: DefenseAction): CharacterMotion | null {
  if (action === "Block") {
    return "block";
  }
  if (action === "Dodge") {
    return "dodge";
  }
  if (action === "Counter") {
    return "counter";
  }
  if (action === "RainbowReflect") {
    return "grandCounter";
  }
  return null;
}
