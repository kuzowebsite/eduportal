"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { signOut } from "firebase/auth"
import { LogOut, User, FileText, Trophy, HelpCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { auth } from "@/lib/firebase"
import Link from "next/link"

interface UserNavProps {
  user: {
    firstName: string
    lastName: string
    email: string
    profileImage?: string
  }
}

export function UserNav({ user }: UserNavProps) {
  const router = useRouter()

  const handleLogout = () => {
    signOut(auth).then(() => {
      router.push("/login")
    })
  }

  // Get initials from first and last name
  const getInitials = () => {
    const firstInitial = user.firstName ? user.firstName.charAt(0) : ""
    const lastInitial = user.lastName ? user.lastName.charAt(0) : ""
    return (firstInitial + lastInitial).toUpperCase()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full hover:bg-cyan-900/50 transition-colors">
          <Avatar className="h-10 w-10 border-2 border-cyan-900/50">
            {user.profileImage ? (
              <AvatarImage src={user.profileImage} alt={`${user.firstName} ${user.lastName}`} />
            ) : null}
            <AvatarFallback className="bg-gradient-to-br from-cyan-600 to-cyan-500 text-white">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56 mt-1 animate-slide-up bg-card/90 backdrop-blur-sm border border-border/50 text-white"
        align="end"
        forceMount
      >
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-base font-medium leading-none">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs leading-none text-cyan-300">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border/50" />
        <DropdownMenuItem asChild className="hover:bg-cyan-900/50 cursor-pointer focus:bg-cyan-900/70">
          <Link href="/profile" className="flex w-full items-center">
            <User className="mr-2 h-4 w-4 text-cyan-400" />
            <span>Профайл</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="hover:bg-cyan-900/50 cursor-pointer focus:bg-cyan-900/70">
          <Link href="/results" className="flex w-full items-center">
            <FileText className="mr-2 h-4 w-4 text-green-400" />
            <span>Шалгалтын дүн</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="hover:bg-cyan-900/50 cursor-pointer focus:bg-cyan-900/70">
          <Link href="/rank" className="flex w-full items-center">
            <Trophy className="mr-2 h-4 w-4 text-purple-400" />
            <span>Ранк</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="hover:bg-cyan-900/50 cursor-pointer focus:bg-cyan-900/70">
          <Link href="/help" className="flex w-full items-center">
            <HelpCircle className="mr-2 h-4 w-4 text-purple-400" />
            <span>Тусламж</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border/50" />
        <DropdownMenuItem onClick={handleLogout} className="hover:bg-red-900/50 cursor-pointer focus:bg-red-900/70">
          <LogOut className="mr-2 h-4 w-4 text-red-400" />
          <span>Гарах</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

