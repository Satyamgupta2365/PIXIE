"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"

const Star = ({ delay }: { delay: number }) => (
  <motion.div
    className="absolute bg-white rounded-full"
    style={{
      width: Math.random() * 3 + 1 + "px",
      height: Math.random() * 3 + 1 + "px",
      top: Math.random() * 100 + "%",
      left: Math.random() * 100 + "%",
    }}
    animate={{
      opacity: [0, 1, 0],
      scale: [0.5, 1, 0.5],
    }}
    transition={{
      duration: 2,
      repeat: Number.POSITIVE_INFINITY,
      delay: delay,
    }}
  />
)

const ShootingStar = () => {
  const startsFromTop = Math.random() > 0.5
  const startPosition = startsFromTop
    ? { top: "-10%", left: `${Math.random() * 100}%` }
    : { top: `${Math.random() * 100}%`, left: "-10%" }

  const endPosition = startsFromTop
    ? { top: "110%", left: `${Number.parseFloat(startPosition.left as string) + 50}%` }
    : { top: `${Number.parseFloat(startPosition.top as string) + 50}%`, left: "110%" }

  return (
    <motion.div
      className="absolute bg-white rounded-full"
      style={{
        width: "2px",
        height: "2px",
        ...startPosition,
        boxShadow: "0 0 0 1px #ffffff10, 0 0 0 2px #ffffff10, 0 0 20px #ffffff50",
      }}
      animate={{
        top: endPosition.top,
        left: endPosition.left,
      }}
      transition={{
        duration: Math.random() * 1.5 + 1,
        ease: "linear",
      }}
    />
  )
}

export default function SpaceBackground({ starDensity = "high" }: { starDensity?: "low" | "medium" | "high" }) {
  const [stars, setStars] = useState<JSX.Element[]>([])
  const [shootingStars, setShootingStars] = useState<JSX.Element[]>([])

  const getStarCount = (density: string) => {
    switch (density) {
      case "low":
        return { regular: 50, shooting: 2 }
      case "medium":
        return { regular: 100, shooting: 4 }
      case "high":
        return { regular: 150, shooting: 8 }
      default:
        return { regular: 100, shooting: 4 }
    }
  }

  const createShootingStar = useCallback(() => {
    const id = Math.random().toString(36).substr(2, 9)
    return <ShootingStar key={id} />
  }, [])

  useEffect(() => {
    const { regular: starCount, shooting: shootingStarCount } = getStarCount(starDensity)
    const newStars = Array.from({ length: starCount }, (_, i) => <Star key={i} delay={Math.random() * 2} />)
    setStars(newStars)

    setShootingStars(Array.from({ length: shootingStarCount }, createShootingStar))

    const interval = setInterval(() => {
      setShootingStars((prev) => {
        const newStars = prev.length > shootingStarCount * 2 ? prev.slice(prev.length - shootingStarCount) : [...prev]
        for (let i = 0; i < Math.ceil(shootingStarCount / 3); i++) {
          newStars.push(createShootingStar())
        }
        return newStars
      })
    }, 1500)

    return () => {
      clearInterval(interval)
    }
  }, [starDensity, createShootingStar])

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-black">
      {stars}
      {shootingStars}
    </div>
  )
}
