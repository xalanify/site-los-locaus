import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, Calendar, TrendingUp, Globe } from 'lucide-react'

export default function StatsSection() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/stats/visitors')
      .then(res => res.json())
      .then(data => {
        setStats(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <section id="stats" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-zinc-500 mx-auto"></div>
        </div>
      </section>
    )
  }

  const statCards = [
    {
      icon: <Globe className="w-8 h-8" />,
      label: 'Online Agora',
      value: stats?.online || 0,
      color: 'text-green-400',
      bgColor: 'bg-green-400/10'
    },
    {
      icon: <Calendar className="w-8 h-8" />,
      label: 'Últimos 15 Dias',
      value: stats?.last15Days || 0,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10'
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      label: 'Últimos 30 Dias',
      value: stats?.last30Days || 0,
      color: 'text-zinc-400',
      bgColor: 'bg-zinc-400/10'
    },
    {
      icon: <Users className="w-8 h-8" />,
      label: 'Último Ano',
      value: stats?.lastYear || 0,
      color: 'text-zinc-400',
      bgColor: 'bg-zinc-400/10'
    }
  ]

  return (
    <section id="stats" className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-black mb-4 gradient-text">Estatísticas</h2>
          <p className="text-gray-400 text-lg">Acompanha o tráfego do site em tempo real</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="glass rounded-2xl p-6 hover:scale-105 transition-all duration-300"
            >
              <div className={`w-16 h-16 rounded-full ${stat.bgColor} flex items-center justify-center mb-4 mx-auto`}>
                <div className={stat.color}>{stat.icon}</div>
              </div>
              <div className="text-4xl font-bold text-white mb-2">
                {stat.value.toLocaleString()}
              </div>
              <div className="text-gray-400 font-medium">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Total de Visitantes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 glass rounded-2xl p-8 text-center"
        >
          <h3 className="text-2xl font-bold text-gray-300 mb-4">Total de Visitantes</h3>
          <div className="text-6xl font-black gradient-text">
            {(stats?.total || 0).toLocaleString()}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
