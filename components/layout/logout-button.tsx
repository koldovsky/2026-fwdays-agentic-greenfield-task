import { IconButton } from "@notely-design/components";
import { logout } from "@/app/actions/auth";
import { IconLogout } from "@/components/icons";

export function LogoutButton() {
  return (
    <form action={logout}>
      <IconButton
        type="submit"
        icon={<IconLogout />}
        label="Log out"
        variant="ghost"
      />
    </form>
  );
}
