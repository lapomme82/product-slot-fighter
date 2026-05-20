import Phaser from "phaser";
import {
  CHARACTER_FRAME_COUNT,
  CHARACTER_MOTIONS,
  SPRITE_ATLAS_DEFINITIONS,
  type SpriteAtlasMetadata,
  getAnimationFrameKey,
  getAnimationFramePath,
  getSpriteAtlasFrameKey,
} from "../../assets/characterAnimations";
import { assetUrl } from "../../assets/paths";
import { FIGHTERS } from "../../content/fighters";

const SLOT_ASSETS = [
  ["slot-frame-attack", "/assets/slot-ui/attack-slot-frame.png"],
  ["slot-frame-defense", "/assets/slot-ui/defense-slot-frame.png"],
  ["slot-weak-attack", "/assets/slot-ui/symbols/weak-attack.png"],
  ["slot-strong-attack", "/assets/slot-ui/symbols/strong-attack.png"],
  ["slot-special", "/assets/slot-ui/symbols/special.png"],
  ["slot-dodge", "/assets/slot-ui/symbols/dodge.png"],
  ["slot-block", "/assets/slot-ui/symbols/block.png"],
  ["slot-counter", "/assets/slot-ui/symbols/counter.png"],
  ["slot-grand-counter", "/assets/slot-ui/symbols/grand-counter.png"],
] as const;

const STAGES = [["stage-finance-center", "/assets/stages/finance-center.png"]] as const;

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    for (const fighter of FIGHTERS) {
      this.load.image(fighter.portraitKey, assetUrl(fighter.portraitPath));
      if (fighter.awakened) {
        this.load.image(`${fighter.portraitKey}-awakened`, assetUrl(fighter.awakened.finalPortraitPath));
      }
      for (const motion of CHARACTER_MOTIONS) {
        for (let frameIndex = 0; frameIndex < CHARACTER_FRAME_COUNT; frameIndex += 1) {
          this.load.image(
            getAnimationFrameKey(fighter.id, motion, frameIndex),
            assetUrl(getAnimationFramePath(fighter.id, motion, frameIndex)),
          );
        }
      }
    }
    for (const [key, path] of SLOT_ASSETS) {
      this.load.image(key, assetUrl(path));
    }
    for (const [key, path] of STAGES) {
      this.load.image(key, assetUrl(path));
    }
    for (const definition of SPRITE_ATLAS_DEFINITIONS) {
      this.load.image(definition.textureKey, assetUrl(definition.imagePath));
      this.load.json(definition.metadataKey, assetUrl(definition.metadataPath));
    }
  }

  create() {
    this.registerSpriteAtlasFrames();
    this.cameras.main.setBackgroundColor(0x111111);
    this.scene.start("MenuScene");
  }

  private registerSpriteAtlasFrames() {
    for (const definition of SPRITE_ATLAS_DEFINITIONS) {
      const texture = this.textures.get(definition.textureKey);
      const metadata = this.cache.json.get(definition.metadataKey) as SpriteAtlasMetadata | undefined;
      if (!texture || !metadata) {
        continue;
      }

      for (const [frameName, frame] of Object.entries(metadata.frames)) {
        const frameKey = getSpriteAtlasFrameKey(definition, frameName);
        if (!texture.has(frameKey)) {
          texture.add(frameKey, 0, frame.x, frame.y, frame.w, frame.h);
        }
      }
    }
  }
}
