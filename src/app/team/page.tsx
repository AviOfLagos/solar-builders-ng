import { redirect } from "next/navigation";

/** The team page moved into the admin. */
export default function Team() {
  redirect("/admin");
}
