import { BrandLogo } from "@/components/BrandLogo";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "plusUltra — Sign in" };

export default function LoginPage() {
  return (
    <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-10 flex flex-col items-center text-center">
        <BrandLogo href="/login" size="hero" showWordmark />
        <p className="mt-5 max-w-xs text-sm leading-relaxed text-fg-muted">
          Slave to the logical brain. Sign in to continue.
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
