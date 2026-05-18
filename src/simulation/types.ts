export type CharacterId =
  | "thunder-discipline"
  | "seahorse-overlord"
  | "seal-judge"
  | "golden-soul-maiden"
  | "glass-heart"
  | "truth-tracker"
  | "longing-soul"
  | "abacus-ghost"
  | "emuji";

export type AttackAction = "WeakAttack" | "StrongAttack" | "AttackFail" | "Special";
export type DefenseAction = "Block" | "Dodge" | "Counter" | "DefenseFail" | "RainbowReflect";
export type AttackReelSymbol = Exclude<AttackAction, "AttackFail">;
export type DefenseReelSymbol = Exclude<DefenseAction, "DefenseFail">;
export type SlotAction = AttackAction | DefenseAction;

export type BattlePhase = "idle" | "slot" | "resolve" | "finished";
export type RoundName = "RoundOf16" | "Quarterfinal" | "Semifinal" | "Final";

export interface Fighter {
  id: CharacterId;
  name: string;
  title: string;
  concept: string;
  maxHp: number;
  weakDamage: number;
  strongDamage: number;
  specialDamage: number;
  attackBias: Partial<Record<AttackAction, number>>;
  defenseBias: Partial<Record<DefenseAction, number>>;
  spriteKey: string;
  portraitKey: string;
  portraitPath: string;
  portraitThumbPath: string;
  selectIntroVideoPath?: string;
  selectFinalPortraitPath?: string;
  palette: {
    primary: number;
    secondary: number;
    accent: number;
  };
}

export interface WeightedEntry<T extends string> {
  value: T;
  weight: number;
}

export interface BracketSlot {
  slot: number;
  fighterId: CharacterId | null;
  isBye: boolean;
}

export interface BracketMatch {
  id: string;
  round: RoundName;
  index: number;
  left: CharacterId | null;
  right: CharacterId | null;
  winner: CharacterId | null;
}

export interface TournamentState {
  seed: string;
  slots: BracketSlot[];
  matches: BracketMatch[];
  champion: CharacterId | null;
}

export interface HiddenCharacterEvent {
  type: "ReplaceFighter" | "FillBye" | "UpgradeHidden";
  fighterId: CharacterId;
  replacedId: CharacterId | null;
  message: string;
  slots: BracketSlot[];
}

export interface FighterBattleState {
  fighterId: CharacterId;
  hp: number;
}

export interface BattleState {
  id: string;
  round: RoundName;
  attacker: CharacterId;
  defender: CharacterId;
  fighters: Record<CharacterId, FighterBattleState>;
  turn: number;
  phase: BattlePhase;
  winner: CharacterId | null;
  log: BattleLogEntry[];
}

export interface BattleLogEntry {
  turn: number;
  attacker: CharacterId;
  defender: CharacterId;
  attackAction: AttackAction;
  defenseAction: DefenseAction;
  attackReels: [AttackReelSymbol, AttackReelSymbol, AttackReelSymbol];
  defenseReels: [DefenseReelSymbol, DefenseReelSymbol, DefenseReelSymbol];
  targetDamage: number;
  reflectedDamage: number;
  summary: string;
}

export interface TurnResolution {
  nextState: BattleState;
  entry: BattleLogEntry;
}

export interface BattleReplay {
  matchId: string;
  round: RoundName;
  left: CharacterId;
  right: CharacterId;
  initialAttacker: CharacterId;
  winner: CharacterId;
  turns: BattleLogEntry[];
}

export interface TournamentReplay {
  seed: string;
  initialSlots: BracketSlot[];
  battles: BattleReplay[];
  matches: BracketMatch[];
  champion: CharacterId;
}
