import Phaser from "phaser";
import {
  CHARACTER_FRAME_COUNT,
  CHARACTER_MOTIONS,
  getAnimationFrameKey,
  getAnimationFramePath,
} from "../../assets/characterAnimations";
import { assetUrl } from "../../assets/paths";
import { FIGHTERS } from "../../content/fighters";

const SLOT_ICONS = [
  ["slot-weak-attack", "/assets/slot-icons/weak-attack.svg"],
  ["slot-strong-attack", "/assets/slot-icons/strong-attack.svg"],
  ["slot-special", "/assets/slot-icons/special.svg"],
  ["slot-dodge", "/assets/slot-icons/dodge.svg"],
  ["slot-block", "/assets/slot-icons/block.svg"],
  ["slot-counter", "/assets/slot-icons/counter.svg"],
  ["slot-grand-counter", "/assets/slot-icons/grand-counter.svg"],
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
    for (const [key, path] of SLOT_ICONS) {
      this.load.svg(key, assetUrl(path), { width: 64, height: 64 });
    }
    for (const [key, path] of STAGES) {
      this.load.image(key, assetUrl(path));
    }
  }

  create() {
    this.cameras.main.setBackgroundColor(0x111111);
    this.scene.start("MenuScene");
  }
}
