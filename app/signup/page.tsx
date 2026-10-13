import { AuthForm } from "@/components/auth-form";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  return <AuthForm mode="signup" searchParams={searchParams} />;
}
