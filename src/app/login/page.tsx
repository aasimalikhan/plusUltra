import { LoginForm } from "./LoginForm";

export const metadata = { title: "plusUltra — Sign in" };

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-medium tracking-tight text-fg">
          plusUltra
        </h1>
        <p className="mt-3 text-sm text-fg-muted">
          Slave to the logical brain. Sign in to continue.
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
