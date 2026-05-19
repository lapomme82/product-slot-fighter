import Phaser from "phaser";
import {
  getAtlasFrameMetadata,
  getAnimationFrameKey,
  getSpriteAtlasFrameKey,
  getSpriteAtlasRuntime,
  type SpriteAtlasRuntime,
} from "../../assets/characterAnimations";
import type { Fighter } from "../../simulation/types";

export interface FighterView {
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  fighterId: Fighter["id"];
  facing: 1 | -1;
  atlas: SpriteAtlasRuntime | null;
  animationTimer: Phaser.Time.TimerEvent | null;
  animationToken: number;
  slotGroup: Phaser.GameObjects.Container;
  slotBox: Phaser.GameObjects.Rectangle;
  slotResultText: Phaser.GameObjects.Text;
  reelIcons: [Phaser.GameObjects.Image, Phaser.GameObjects.Image, Phaser.GameObjects.Image];
}

export function createFighterView(
  scene: Phaser.Scene,
  fighter: Fighter,
  x: number,
  y: number,
  facing: 1 | -1,
  awakened = false,
): FighterView {
  const atlas = getSpriteAtlasRuntime(scene, fighter.id, awakened);
  const idleFrame = atlas ? getAtlasFrameMetadata(atlas, "idle", 0) : null;
  const container = scene.add.container(x, y);
  const shadow = scene.add.ellipse(0, 58, 104, 18, 0x000000, 0.45);
  const sprite = atlas && idleFrame
    ? scene.add.image(0, 68, atlas.definition.textureKey, getSpriteAtlasFrameKey(atlas.definition, idleFrame.frameName))
    : scene.add.image(0, 68, getAnimationFrameKey(fighter.id, "weakAttack", 0));
  sprite.setOrigin(0.5, 1).setScale(atlas ? 1 : 0.86).setFlipX(facing === -1);
  if (idleFrame) {
    sprite.setOrigin(idleFrame.frame.pivotX / idleFrame.frame.w, idleFrame.frame.pivotY / idleFrame.frame.h);
    sprite.setPosition(-idleFrame.frame.offsetX, 68 - idleFrame.frame.offsetY);
  }
  const displayName = awakened && fighter.awakened ? fighter.awakened.name : fighter.name;
  const nameText = scene.add
    .text(0, 94, displayName, {
      fontFamily: "sans-serif",
      fontSize: "18px",
      color: "#fff7d6",
      stroke: "#000000",
      strokeThickness: 4,
    })
    .setOrigin(0.5);
  const slotBox = scene.add.rectangle(0, -128, 166, 58, 0x111827, 0.94).setStrokeStyle(3, fighter.palette.accent);
  const slotResultText = scene.add
    .text(0, -176, "", {
      fontFamily: "sans-serif",
      fontSize: "15px",
      color: "#fff7d6",
      stroke: "#000000",
      strokeThickness: 4,
      align: "center",
    })
    .setOrigin(0.5);
  const reelBacks = [-52, 0, 52].map((offsetX) =>
    scene.add.rectangle(offsetX, -128, 46, 46, 0x020617, 0.92).setStrokeStyle(1, 0x475569),
  );
  const reelIcons = [-52, 0, 52].map((offsetX) =>
    scene.add.image(offsetX, -128, "slot-weak-attack").setDisplaySize(34, 34),
  ) as [Phaser.GameObjects.Image, Phaser.GameObjects.Image, Phaser.GameObjects.Image];
  const slotGroup = scene.add.container(0, 0, [
    slotResultText,
    slotBox,
    ...reelBacks,
    ...reelIcons,
  ]);
  slotGroup.setVisible(false).setAlpha(0);

  container.add([
    shadow,
    sprite,
    nameText,
    slotGroup,
  ]);

  return {
    container,
    sprite,
    fighterId: fighter.id,
    facing,
    atlas,
    animationTimer: null,
    animationToken: 0,
    slotGroup,
    slotBox,
    slotResultText,
    reelIcons,
  };
}
