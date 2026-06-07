'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check, Clock } from 'lucide-react'
import { formatINR } from '@/utils/format'
import { computeTotal } from '@/utils/booking'
import type { Service } from '@/types'

interface ServiceSelectorProps {
  services: Service[]
  onConfirm: (selected: Service[]) => void
}

export function ServiceSelector({ services, onConfirm }: ServiceSelectorProps) {
  const [selected, setSelected] = useState<string[]>([])

  function toggle(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id])
  }

  const selectedServices = services.filter((s) => selected.includes(s.id))
  const total = computeTotal(selectedServices)
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0)

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Choose Services</h2>
      <div className="space-y-2">
        {services.map((svc) => {
          const isSelected = selected.includes(svc.id)
          return (
            <Card
              key={svc.id}
              className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-rose-400 bg-rose-50' : 'hover:bg-gray-50'}`}
              onClick={() => toggle(svc.id)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-rose-500 border-rose-500' : 'border-gray-300'}`}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{svc.name}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                    <Clock className="w-3 h-3" />
                    <span>{svc.duration} min</span>
                    <Badge variant="outline" className="text-xs">{svc.category}</Badge>
                  </div>
                </div>
                <span className="font-semibold text-gray-800 shrink-0">{formatINR(svc.price)}</span>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {selected.length > 0 && (
        <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">{selected.length} service{selected.length > 1 ? 's' : ''}</span>
            <span className="text-gray-500">{totalDuration} min total</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span className="text-rose-600">{formatINR(total)}</span>
          </div>
        </div>
      )}

      <Button
        className="w-full bg-rose-500 hover:bg-rose-600"
        disabled={selected.length === 0}
        onClick={() => onConfirm(selectedServices)}
      >
        {selected.length === 0 ? 'Select at least one service' : `Continue — ${formatINR(total)}`}
      </Button>
    </div>
  )
}
