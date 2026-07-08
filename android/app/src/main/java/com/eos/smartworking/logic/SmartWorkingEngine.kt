package com.eos.smartworking.logic

import com.eos.smartworking.model.DayState
import com.eos.smartworking.model.Permutation
import com.eos.smartworking.model.SwRule
import com.eos.smartworking.model.WeekPlan

/**
 * Engine per generare permutazioni di Smart Working.
 * Porting diretto da smartworking.ts
 */
object SmartWorkingEngine {

    private const val EPSILON = 0.001

    data class TargetResult(val targetSW: Double, val targetOffice: Double)

    fun computeTarget(rule: SwRule, workedCount: Int): TargetResult {
        val targetSW = when (rule.type) {
            "percentage" -> {
                val raw = (rule.value / 100.0) * workedCount
                // Arrotondamento: 2.4→2.5, 1.8→2.0, 1.2→1.0, 0.6→0.0
                when (workedCount) {
                    4 -> Math.ceil(raw * 2) / 2.0  // 2.4→2.5
                    3 -> Math.ceil(raw * 2) / 2.0  // 1.8→2.0
                    2 -> Math.floor(raw * 2) / 2.0 // 1.2→1.0
                    1 -> Math.floor(raw * 2) / 2.0 // 0.6→0.0
                    else -> Math.round(raw * 2) / 2.0
                }
            }
            "fixed" -> minOf(rule.value.toDouble(), workedCount.toDouble())
            else -> 0.0
        }
        val targetOffice = workedCount - targetSW
        return TargetResult(targetSW, targetOffice)
    }

    fun describeSwRule(rule: SwRule): String = when (rule.type) {
        "percentage" -> "${rule.value}% Smart Working"
        "fixed" -> "Max ${rule.value} giorni SW"
        else -> "Nessuna regola"
    }

    fun generateAllPermutations(dayStates: WeekPlan, rule: SwRule): List<Permutation> {
        val workedCount = dayStates.count { it != DayState.ABSENT }
        val (targetSW, _) = computeTarget(rule, workedCount)

        val freeIndices = dayStates.mapIndexedNotNull { i, s -> if (s == DayState.FREE) i else null }
        var fixedSW = 0.0
        dayStates.forEach { if (it == DayState.SW) fixedSW += 1.0 }

        val k = freeIndices.size

        if (k == 0) {
            val valid = fixedSW <= targetSW + EPSILON
            val adherence = if (targetSW > 0) minOf(fixedSW / targetSW, 1.0) else 1.0
            return listOf(Permutation(dayStates.toList(), fixedSW, workedCount - fixedSW, valid, adherence))
        }

        val totalCombos = Math.pow(3.0, k.toDouble()).toInt()
        val choices = listOf(DayState.SW, DayState.OFFICE, DayState.HALF)
        val all = mutableListOf<Permutation>()

        for (mask in 0 until totalCombos) {
            val week = dayStates.toMutableList()
            var assignedSW = 0.0
            var m = mask

            for (bit in 0 until k) {
                val choice = m % 3
                m /= 3
                val dayIdx = freeIndices[bit]
                val state = choices[choice]
                week[dayIdx] = state
                when (state) {
                    DayState.SW -> assignedSW += 1.0
                    DayState.OFFICE -> { /* no-op */ }
                    DayState.HALF -> assignedSW += 0.5
                    else -> {}
                }
            }

            val totalSW = fixedSW + assignedSW
            val totalOffice = workedCount - totalSW
            val valid = totalSW <= targetSW + EPSILON
            val adherence = if (targetSW > 0) minOf(totalSW / targetSW, 1.0) else 1.0

            all.add(Permutation(week.toList(), totalSW, totalOffice, valid, adherence))
        }

        all.sortByDescending { it.totalSW }
        return all
    }
}
