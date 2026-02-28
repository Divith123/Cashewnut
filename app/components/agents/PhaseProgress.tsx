/**
 * PhaseProgress — Horizontal phase progress indicator with gates
 */

import { motion } from 'framer-motion';
import type { Phase, PhaseGate } from '~/lib/agents/types';
import { PHASES } from '~/lib/agents/types';

interface PhaseProgressProps {
    currentPhase: Phase;
    phaseGates: PhaseGate[];
}

export function PhaseProgress({ currentPhase, phaseGates }: PhaseProgressProps) {
    const currentIdx = PHASES.findIndex((p) => p.phase === currentPhase);

    return (
        <div className="phase-progress">
            <div className="phase-progress-track">
                {PHASES.map((p, idx) => {
                    const gate = phaseGates.find((g) => g.phase === p.phase);
                    const isCompleted = gate?.approved || false;
                    const isCurrent = p.phase === currentPhase;
                    const isPast = idx < currentIdx;

                    return (
                        <div key={p.phase} className="phase-progress-item">
                            {idx > 0 && (
                                <div className={`phase-progress-connector ${isPast || isCompleted ? 'completed' : ''}`} />
                            )}
                            <motion.div
                                className={`phase-progress-node ${isCompleted ? 'completed' : isCurrent ? 'current' : 'pending'
                                    }`}
                                animate={isCurrent ? { scale: [1, 1.1, 1] } : {}}
                                transition={isCurrent ? { duration: 2, repeat: Infinity } : {}}
                            >
                                <span className="phase-node-emoji">{isCompleted ? '✅' : p.emoji}</span>
                            </motion.div>
                            <span className={`phase-progress-label ${isCurrent ? 'current' : ''}`}>
                                {p.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
