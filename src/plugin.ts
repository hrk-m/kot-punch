import streamDeck from "@elgato/streamdeck";

import { ClockIn } from "./actions/clock-in";
import { ClockOut } from "./actions/clock-out";

// Keep logs at info by default to avoid verbose payload logging in normal usage.
streamDeck.logger.setLevel("info");

// Register the clock-in and clock-out actions.
streamDeck.actions.registerAction(new ClockIn());
streamDeck.actions.registerAction(new ClockOut());

// Finally, connect to the Stream Deck.
streamDeck.connect();
