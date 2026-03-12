import streamDeck from "@elgato/streamdeck";

import { ClockIn } from "./actions/clock-in";
import { ClockOut } from "./actions/clock-out";
import { OpenKot } from "./actions/open-kot";
import { OpenRequest } from "./actions/open-request";
import { ResetPunchState } from "./actions/reset-punch-state";

// 5 つの action を登録する。
streamDeck.actions.registerAction(new ClockIn());
streamDeck.actions.registerAction(new ClockOut());
streamDeck.actions.registerAction(new OpenKot());
streamDeck.actions.registerAction(new OpenRequest());
streamDeck.actions.registerAction(new ResetPunchState());

// Stream Deck と接続する。
streamDeck.connect();
