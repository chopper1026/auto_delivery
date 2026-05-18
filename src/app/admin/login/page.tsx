"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction, type LoginState } from "@/app/admin/login/actions";

const initialState: LoginState = {};

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <main className="min-h-screen bg-[var(--surface)] px-6 py-12 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-md items-center">
        <Card className="w-full border-cyan-300/20 bg-slate-950/80">
          <CardHeader>
            <CardDescription className="uppercase tracking-[0.36em] text-cyan-300">Admin Gate</CardDescription>
            <CardTitle className="text-3xl">后台登录</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username">账号</Label>
                <Input id="username" name="username" autoComplete="username" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <Input id="password" name="password" type="password" autoComplete="current-password" required />
              </div>
              {state.error ? <p className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-200">{state.error}</p> : null}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "登录中..." : "登录"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
