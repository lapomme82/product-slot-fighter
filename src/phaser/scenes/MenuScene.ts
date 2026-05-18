import Phaser from "phaser";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("MenuScene");
  }

  create() {
    this.cameras.main.setBackgroundColor(0x18120d);
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, "무협 슬롯 토너먼트", {
        fontFamily: "serif",
        fontSize: "34px",
        color: "#f7d778",
      })
      .setOrigin(0.5);
    this.add
      .text(this.scale.width / 2, this.scale.height / 2 + 46, "게임 시작을 누르면 대진표가 생성됩니다", {
        fontFamily: "sans-serif",
        fontSize: "15px",
        color: "#e7d6b6",
      })
      .setOrigin(0.5);
  }
}
