import Phaser from "phaser";
import { FIGHTER_BY_ID } from "../../content/fighters";
import type { CharacterId } from "../../simulation/types";

export class ResultScene extends Phaser.Scene {
  constructor() {
    super("ResultScene");
  }

  create() {
    const champion = this.registry.get("champion") as CharacterId | undefined;
    const fighter = champion ? FIGHTER_BY_ID[champion] : null;
    this.cameras.main.setBackgroundColor(0x100f14);

    if (fighter) {
      const portrait = this.add.image(this.scale.width / 2, this.scale.height / 2, fighter.portraitKey).setAlpha(0.38);
      const source = portrait.texture.getSourceImage() as { width?: number; height?: number };
      const sourceWidth = source.width ?? 360;
      const sourceHeight = source.height ?? 360;
      const scale = Math.min(360 / sourceWidth, 360 / sourceHeight);
      portrait.setDisplaySize(Math.round(sourceWidth * scale), Math.round(sourceHeight * scale));
    }

    this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 42, "우승", {
        fontFamily: "serif",
        fontSize: "28px",
        color: "#facc15",
      })
      .setOrigin(0.5);
    this.add
      .text(this.scale.width / 2, this.scale.height / 2 + 8, fighter ? `${fighter.title} ${fighter.name}` : "미정", {
        fontFamily: "serif",
        fontSize: "40px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 5,
      })
      .setOrigin(0.5);
  }
}
