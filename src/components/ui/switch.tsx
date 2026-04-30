import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useTheme } from "@/lib/themeProvider";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => {

  console.log(props.role); 
  
  const theme = useTheme()


  return (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none inline-flex items-center justify-center h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
      )}
    >
        {(theme.theme === "dark" && props.role === "themeSwitch")  ? (
          <Moon className="h-4 w-4 transition-transform group-hover:translate-x-0.5"></Moon>
        ) : (
          <Sun className="h-4 w-4 transition-transform group-hover:translate-x-0.5"></Sun>
        )}  
    </SwitchPrimitives.Thumb>

  </SwitchPrimitives.Root>
  )

});
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
