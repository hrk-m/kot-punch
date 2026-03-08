import streamDeck from "@elgato/streamdeck";

import { ClockIn } from "./actions/clock-in";
import { ClockOut } from "./actions/clock-out";
import { OpenKot } from "./actions/open-kot";
import { OpenRequest } from "./actions/open-request";

// Register the clock-in, clock-out, open-kot, and open-request actions.
streamDeck.actions.registerAction(new ClockIn());
streamDeck.actions.registerAction(new ClockOut());
streamDeck.actions.registerAction(new OpenKot());
streamDeck.actions.registerAction(new OpenRequest());

// Finally, connect to the Stream Deck.
streamDeck.connect();
