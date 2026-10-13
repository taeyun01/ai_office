import { StatusScreen } from "@/components/status-screen";

export default function Page() {
  return (
    <StatusScreen
      title="관리자 승인 대기 중"
      description="가입이 접수되었습니다. 관리자가 승인하면 오피스에 들어갈 수 있습니다."
    />
  );
}
