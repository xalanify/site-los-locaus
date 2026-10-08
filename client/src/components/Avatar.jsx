import { motion } from 'framer-motion'
import { Shield } from 'lucide-react'

export default function Avatar({ isAdmin, onClick }) {
  return (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ delay: 1 }}
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 group"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
        isAdmin 
          ? 'bg-orange-500 glow-orange' 
          : 'glass hover:bg-orange-500/20'
      }`}>
        <Shield className={`w-8 h-8 ${isAdmin ? 'text-white' : 'text-gray-400 group-hover:text-orange-500'}`} />
      </div>
      
      {/* Tooltip */}
      <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-dark/90 rounded-lg text-sm text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
        {isAdmin ? 'Painel Admin' : 'Login Admin'}
      </div>
    </motion.button>
  )
}
