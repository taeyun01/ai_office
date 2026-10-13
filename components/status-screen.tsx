import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { logout } from "@/lib/actions/auth";

// pending / rejected 처럼 메시지와 로그아웃만 보여주는 화면
export function StatusScreen({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={logout}>
            <Button variant="outline" type="submit">
              로그아웃
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
