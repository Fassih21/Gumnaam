import { createFileRoute } from "@tanstack/react-router";
import { Github, Linkedin, ShieldCheck, EyeOff, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [{ title: "About — Gumnaam" }],
  }),
  component: AboutPage,
});

const team = [
  {
    role: "Founder",
    name: "Fassih Kamran",
    github: "https://github.com/Fassih21",
    linkedin: "https://www.linkedin.com/in/fassih-kamran-46a5122a0",
  },
  {
    role: "Co-founder",
    name: "M. Anas Safdar",
    github: "https://github.com/anas6353",
    linkedin: "https://www.linkedin.com/in/anas-safdar-7892812bb",
  },
];

function AboutPage() {
  return (
    <AppShell>
      <h1 className="wordmark text-2xl text-foreground">About Gumnaam</h1>
      <p className="meta mt-1">why we built this, and how it works</p>

      <div className="surface mt-6 p-6">
        <p className="text-sm leading-relaxed text-foreground/90">
          We've all been there — a thought worth sharing, an opinion worth voicing, an
          experience worth talking about — but we hold back. Not because it isn't true, but
          because of the one question that stops us every time:{" "}
          <span className="italic text-foreground">log kia sochein ge?</span>
        </p>
        <p className="mt-3 text-sm leading-relaxed text-foreground/90">
          That's the gap Gumnaam was built to close. A space where UOL students can say what's
          actually on their mind — the funny, the frustrating, the honest — without a name
          attached to it, and without the weight of who's watching. Just the thought, out in
          the open, for what it is.
        </p>
      </div>

      <div className="surface mt-4 p-6">
        <div className="flex items-center gap-2">
          <EyeOff className="size-4 text-primary" />
          <h2 className="text-base font-medium">How anonymity works</h2>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Your university email is used only to verify you're a real UOL student — it's never
          shown to other users, and every account posts under a random{" "}
          <span className="font-mono">Anon#XXXX</span> handle instead of a name.
        </p>
      </div>

      <div className="surface mt-4 p-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-emerald-400" />
          <h2 className="text-base font-medium">Keeping it safe</h2>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Posts are moderated for harmful content, accounts that break the rules can be
          restricted, and anyone can report a post or comment for a team member to review.
        </p>
      </div>

      <div className="surface mt-4 p-6">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-muted-foreground" />
          <h2 className="text-base font-medium">Team</h2>
        </div>
        <div className="mt-4 space-y-4">
          {team.map((member) => (
            <div key={member.name} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{member.name}</p>
                <p className="meta">{member.role}</p>
              </div>
              <div className="flex items-center gap-1">
                <a
                  href={member.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${member.name} on GitHub`}
                  className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <Github className="size-4" />
                </a>
                <a
                  href={member.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${member.name} on LinkedIn`}
                  className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <Linkedin className="size-4" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}