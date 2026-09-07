import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "react-router-dom";
import { useGoogleAuth } from "@/lib/useGoogleAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileText, Loader2 } from "lucide-react";
import Icon from "@/assets/img/Base-logo-blue.svg";
import { FcGoogle } from "react-icons/fc";

export default function AuthPage() {
  const { login, signUp } = useAuth();
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { signInWithGoogle } = useGoogleAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isSignUp && password !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(name, email, password);
      } else {
        await login(email, password);
      }
      navigate("/", { replace: true });
    } catch (err: any) {
      const message = err || "Произошла ошибка";
      setError(String(message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex items-start justify-center gap-3 mb-8">
          <div className="flex items-center justify-center md:w-14 md:h-14 sm:mt-1 md:mt-1.5 w-12 h-12 rounded-xl bg-primary">
            <img src={Icon} alt="" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">
              Fine PAPERs
            </h1>
            <p className="text-sm text-muted-foreground">
              Конструктор учебных работ
            </p>
          </div>
        </div>

        <Card className="shadow-lg border-border">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl font-display">
              {isSignUp ? "Регистрация" : "Вход"}
            </CardTitle>
            <CardDescription>
              {isSignUp
                ? "Создайте аккаунт для начала работы"
                : "Войдите в свой аккаунт"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="name">Имя пользователя</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ваш логин"
                    required
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">
                  Email{isSignUp ? "" : " или логин"}
                </Label>
                <Input
                  id="email"
                  type={`${isSignUp ? "email" : "text"}`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="confirm">Подтвердите пароль</Label>
                  <Input
                    id="confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSignUp ? "Создать аккаунт" : "Войти"}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Button
                variant="secondary"
                type="button"
                className="flex w-full justify-center gap-3"
                onClick={() => {
                  signInWithGoogle();
                }}
              >
                <FcGoogle className="w-8 h-8" />
                Войти через Google
              </Button>
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError("");
                }}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {isSignUp
                  ? "Уже есть аккаунт? Войти"
                  : "Нет аккаунта? Зарегистрироваться"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
