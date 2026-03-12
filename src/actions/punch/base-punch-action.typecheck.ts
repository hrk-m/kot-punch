import type { KeyDownEvent, KeyUpEvent, SingletonAction } from "@elgato/streamdeck";
import type { KotPunchSettings } from "../../platform/streamdeck/settings/punch-settings";
import type { BasePunchAction } from "./base-punch-action";

type Assert<T extends true> = T;
type IsEqual<A, B> =
    (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
        ? (<T>() => T extends B ? 1 : 2) extends (<T>() => T extends A ? 1 : 2)
            ? true
            : false
        : false;

type _BasePunchActionExtendsSingletonAction = Assert<
    BasePunchAction extends SingletonAction<KotPunchSettings> ? true : false
>;
type _BasePunchActionKeyDownEvent = Assert<
    IsEqual<Parameters<BasePunchAction["onKeyDown"]>[0], KeyDownEvent<KotPunchSettings>>
>;
type _BasePunchActionKeyUpEvent = Assert<
    IsEqual<Parameters<BasePunchAction["onKeyUp"]>[0], KeyUpEvent<KotPunchSettings>>
>;
