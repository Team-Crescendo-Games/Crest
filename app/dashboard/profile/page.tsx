import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { User, Mail, Lock, Camera, Calendar } from "lucide-react";
import { ProfileForm } from "./profile-form";
import { EmailForm } from "./email-form";
import { PasswordForm } from "./password-form";
import { ProfilePictureUpload } from "./profile-picture-upload";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      createdAt: true,
      _count: {
        select: {
          memberships: true,
          authoredTasks: true,
        },
      },
    },
  });

  if (!user) redirect("/sign-in");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-mono text-lg font-semibold text-fg-primary">
        Profile
      </h1>
      <p className="mt-1 text-xs text-fg-muted">Manage your account settings</p>

      {/* Profile header */}
      <div className="mt-6 flex items-center gap-4 rounded-md border border-border bg-bg-elevated/60 p-4 backdrop-blur-sm">
        <ProfilePictureUpload currentImage={user.image} userName={user.name} />
        <div>
          <p className="font-mono text-sm font-semibold text-fg-primary">
            {user.name}
          </p>
          <p className="text-xs text-fg-muted">{user.email}</p>
          <div className="mt-1.5 flex items-center gap-3 text-[11px] text-fg-muted">
            <span className="flex items-center gap-1">
              <Calendar size={10} />
              Joined {user.createdAt.toLocaleDateString()}
            </span>
            <span>
              {user._count.memberships} workspace
              {user._count.memberships !== 1 && "s"}
            </span>
            <span>
              {user._count.authoredTasks} task
              {user._count.authoredTasks !== 1 && "s"} created
            </span>
          </div>
        </div>
      </div>

      {/* Name */}
      <section className="mt-8">
        <h2 className="flex items-center gap-2 font-mono text-sm font-medium text-fg-primary">
          <User size={14} className="text-accent" />
          Display Name
        </h2>
        <div className="mt-3">
          <ProfileForm currentName={user.name ?? ""} />
        </div>
      </section>

      {/* Email */}
      <section className="mt-8">
        <h2 className="flex items-center gap-2 font-mono text-sm font-medium text-fg-primary">
          <Mail size={14} className="text-accent" />
          Email Address
        </h2>
        <div className="mt-3">
          <EmailForm currentEmail={user.email ?? ""} />
        </div>
      </section>

      {/* Password */}
      <section className="mt-8">
        <h2 className="flex items-center gap-2 font-mono text-sm font-medium text-fg-primary">
          <Lock size={14} className="text-accent" />
          Change Password
        </h2>
        <div className="mt-3">
          <PasswordForm />
        </div>
      </section>
    </div>
  );
}
