import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { login, signup } from "@/lib/actions/auth";

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

type Params = Promise<{ error?: string; sent?: string }>;

// searchParams는 요청 시점 데이터라 Suspense 안에서만 읽는다 (Cache Components 규칙)
async function Notice({ searchParams }: { searchParams: Params }) {
  const { error, sent } = await searchParams;
  if (error) return <p className="text-sm text-red-500">{error}</p>;
  if (sent)
    return (
      <p className="text-sm text-green-600">
        확인 메일을 보냈습니다. 메일의 링크를 눌러 가입을 완료하세요.
      </p>
    );
  return null;
}

export function AuthForm({
  mode,
  searchParams,
}: {
  mode: "login" | "signup";
  searchParams: Params;
}) {
  const isLogin = mode === "login";
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">
            {isLogin ? "로그인" : "회원가입"}
          </CardTitle>
          <CardDescription>
            {isLogin
              ? "AIOffice에 들어가려면 로그인하세요."
              : "가입 후 관리자 승인을 받아야 입장할 수 있습니다."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={isLogin ? login : signup} className="flex flex-col gap-3">
            {!isLogin && (
              <input
                name="display_name"
                placeholder="이름"
                className={inputClass}
              />
            )}
            <input
              name="email"
              type="email"
              placeholder="이메일"
              required
              className={inputClass}
            />
            <input
              name="password"
              type="password"
              placeholder="비밀번호 (6자 이상)"
              required
              minLength={6}
              className={inputClass}
            />
            <Suspense>
              <Notice searchParams={searchParams} />
            </Suspense>
            <Button type="submit">{isLogin ? "로그인" : "가입하기"}</Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {isLogin ? (
              <>
                계정이 없나요? <Link href="/signup" className="underline">회원가입</Link>
              </>
            ) : (
              <>
                이미 계정이 있나요? <Link href="/login" className="underline">로그인</Link>
              </>
            )}
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
