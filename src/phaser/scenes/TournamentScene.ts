import Phaser from "phaser";

export class TournamentScene extends Phaser.Scene {
  constructor() {
    super("TournamentScene");
  }

  create() {
    this.cameras.main.setBackgroundColor(0x151515);
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, "대진표 준비 완료", {
        fontFamily: "sans-serif",
        fontSize: "28px",
        color: "#f7d778",
      })
      .setOrigin(0.5);
  }
}
