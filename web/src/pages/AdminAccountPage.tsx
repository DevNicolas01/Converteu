import { useParams } from "react-router-dom";
import AccountShell from "../components/AccountShell";

export default function AdminAccountPage() {
  const { accountId } = useParams<{ accountId: string }>();
  if (!accountId) return null;
  return <AccountShell accountId={accountId} asAdmin />;
}
