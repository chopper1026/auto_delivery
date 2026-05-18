"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { redeemAction, type RedeemState } from "@/app/actions/redeem";

const initialState: RedeemState = {};

export function RedeemForm() {
  const [state, formAction, pending] = useActionState(redeemAction, initialState);

  return (
    <form action={formAction} className="mt-10 rounded-[2rem] border border-cyan-300/20 bg-slate-950/70 p-3 shadow-2xl shadow-cyan-950/30 backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          name="cardKey"
          placeholder="AD-XXXX-XXXX-XXXX-XXXX"
          autoComplete="off"
          className="h-14 flex-1 border-slate-700 bg-black/40 text-base uppercase tracking-[0.18em]"
          required
        />
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "兑换中..." : "立即兑换"}
        </Button>
      </div>
      {state.error ? <p className="px-2 pt-3 text-sm text-red-200">{state.error}</p> : null}
    </form>
  );
}
