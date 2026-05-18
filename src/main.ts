import "./styles.css";
import { createPhaserGame } from "./phaser/game";
import { mountApp } from "./ui/app";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Missing #app root.");
}

const gameHost = document.createElement("div");
gameHost.id = "phaser-host";
document.body.appendChild(gameHost);

const game = createPhaserGame(gameHost);
mountApp(app, game);
