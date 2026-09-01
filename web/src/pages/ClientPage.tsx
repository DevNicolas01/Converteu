import { useAuth } from "../context/useAuth";
import AccountShell from "../components/AccountShell";

export default function ClientPage() {
  const { user } = useAuth();
  if (!user) return null;
  return <AccountShell accountId={user.uid} />;
}
