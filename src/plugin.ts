import streamDeck from "@elgato/streamdeck";

import { ClockIn } from "./actions/clock-in";
import { ClockOut } from "./actions/clock-out";
import { OpenKot } from "./actions/open-kot";

// Keep logs at info by default to avoid verbose payload logging in normal usage.
streamDeck.logger.setLevel("info");

// Register the clock-in, clock-out, and open-kot actions.
streamDeck.actions.registerAction(new ClockIn());
streamDeck.actions.registerAction(new ClockOut());
streamDeck.actions.registerAction(new OpenKot());

// Finally, connect to the Stream Deck.
streamDeck.connect();
