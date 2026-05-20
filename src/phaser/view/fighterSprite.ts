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
  slotFrame: Phaser.GameObjects.Image;
  slotResultText: Phaser.GameObjects.Text;
  reelIcons: [Phaser.GameObjects.Image, Phaser.GameObjects.Image, Phaser.GameObjects.Image];
}

export const SLOT_REEL_CENTER_Y = -130.5;
export const SLOT_REEL_ICON_SIZE = 26;
export const SLOT_REEL_ICON_SCALE = SLOT_REEL_ICON_SIZE / 220;

const SLOT_FRAME_Y = -138;
const SLOT_FRAME_WIDTH = 138;
const SLOT_FRAME_SOURCE_WIDTH = 900;
const SLOT_FRAME_SCALE = SLOT_FRAME_WIDTH / SLOT_FRAME_SOURCE_WIDTH;
const SLOT_REEL_OFFSETS = [-34.5, 0, 34.5] as const;

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
  const slotFrameKey = facing === 1 ? "slot-frame-attack" : "slot-frame-defense";
  const slotFrame = scene.add.image(0, SLOT_FRAME_Y, slotFrameKey).setScale(SLOT_FRAME_SCALE);
  const slotResultText = scene.add
    .text(0, -194, "", {
      fontFamily: "sans-serif",
      fontSize: "12px",
      color: "#fff7d6",
      stroke: "#000000",
      strokeThickness: 3,
      align: "center",
    })
    .setOrigin(0.5);
  const reelBacks = SLOT_REEL_OFFSETS.map((offsetX) =>
    scene.add.rectangle(offsetX, SLOT_REEL_CENTER_Y, 27, 35, 0x020617, 0.82).setStrokeStyle(1, 0x2c1b13),
  );
  const reelIcons = SLOT_REEL_OFFSETS.map((offsetX) =>
    scene.add.image(offsetX, SLOT_REEL_CENTER_Y, "slot-weak-attack").setScale(SLOT_REEL_ICON_SCALE),
  ) as [Phaser.GameObjects.Image, Phaser.GameObjects.Image, Phaser.GameObjects.Image];
  const slotGroup = scene.add.container(0, 0, [
    ...reelBacks,
    ...reelIcons,
    slotFrame,
    slotResultText,
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
    slotFrame,
    slotResultText,
    reelIcons,
  };
}
