import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../lib/api'

/* ── Types ─────────────────────────────────────────────────────────── */

export type GatewayConfig = {
    id: string
    gateway_name: string
    enabled: boolean
    has_api_key: boolean
}

export type RoutingRule = {
    id: string
    rule_type: string
    gateway_name: string
    conditions: string | null
    priority: number
}

type MerchantContextType = {
    configs: GatewayConfig[]
    rules: RoutingRule[]
    loading: boolean
    refreshAll: () => Promise<void>
    updateConfigOptimistic: (name: string, enabled: boolean) => void
    rollbackConfig: (configs: GatewayConfig[]) => void
    deleteRuleOptimistic: (id: string) => void
    rollbackRules: (rules: RoutingRule[]) => void
}

const MerchantContext = createContext<MerchantContextType | undefined>(undefined)

export function MerchantProvider({ children }: { children: React.ReactNode }) {
    const [configs, setConfigs] = useState<GatewayConfig[]>([])
    const [rules, setRules] = useState<RoutingRule[]>([])
    const [loading, setLoading] = useState(true)

    const refreshAll = useCallback(async () => {
        try {
            const [configRes, rulesRes] = await Promise.all([
                api.get('/gateways/config'),
                api.get('/gateways/rules'),
            ])
            setConfigs(configRes.data)
            setRules(rulesRes.data)
        } catch (err) {
            console.error('Failed to prefetch merchant data', err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        refreshAll()
    }, [refreshAll])

    const updateConfigOptimistic = (name: string, enabled: boolean) => {
        setConfigs(prev => prev.map(c =>
            c.gateway_name === name ? { ...c, enabled } : c
        ))
    }

    const rollbackConfig = (oldConfigs: GatewayConfig[]) => {
        setConfigs(oldConfigs)
    }

    const deleteRuleOptimistic = (id: string) => {
        setRules(prev => prev.filter(r => r.id !== id))
    }

    const rollbackRules = (oldRules: RoutingRule[]) => {
        setRules(oldRules)
    }

    return (
        <MerchantContext.Provider value={{
            configs, rules, loading, refreshAll,
            updateConfigOptimistic, rollbackConfig,
            deleteRuleOptimistic, rollbackRules
        }}>
            {children}
        </MerchantContext.Provider>
    )
}

export function useMerchant() {
    const context = useContext(MerchantContext)
    if (context === undefined) {
        throw new Error('useMerchant must be used within a MerchantProvider')
    }
    return context
}
