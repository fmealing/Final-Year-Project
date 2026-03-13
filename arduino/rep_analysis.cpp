#include "rep_counting.h"

// Simulate one sample of IMU data at a given time.
// The sensor is stationary except for acc.z which oscillates at 0.5 Hz (2s per rep)
// with 5 m/s² amplitude on top of gravity (9.81). This gives a clear VM signal.
ImuData simulateImu(unsigned long time_ms) {
    float t = time_ms / 1000.0f;
    ImuData d;
    d.time_ms  = time_ms;
    d.acc.x    = 0.05f * sinf(2.0f * M_PI * 1.1f * t);   // small cross-axis noise
    d.acc.y    = 0.05f * cosf(2.0f * M_PI * 0.9f * t);
    d.acc.z    = 9.81f + 5.0f * sinf(2.0f * M_PI * 0.5f * t);  // 0.5 Hz rep motion
    d.gyro.x   = 0.0f;
    d.gyro.y   = 0.0f;
    d.gyro.z   = 0.0f;
    return d;
}

void runRepAnalysis() {
    LowPassFilter  lpf    = {{}, false};
    HighPassFilter vm_hpf = {0.0f, 0.0f, false};
    SlidingWindow  window = {{}, 0, 0};

    const float SAMPLE_HZ    = 50.0f;
    const float dt           = 1.0f / SAMPLE_HZ;
    const int   TOTAL_SAMPLES = 5000;          // 100 seconds @ 50 Hz = 50 reps expected

    const float VM_HIGH =  1.5f;
    const float VM_LOW  = -1.5f;

    int   MIDSV        = 0, consec_above = 0, consec_below = 0;
    int   MCSV         = 0;
    int   rep_count    = 0;
    float prev_vm      = 0.0f, prev_prev_vm = 0.0f;
    unsigned long motion_start_ms = 0;
    unsigned long rep_start_ms    = 0, rep_deepest_ms = 0;
    MotionLog mlog = {{}, 0};

    for (int i = 0; i < TOTAL_SAMPLES; i++) {
        unsigned long time_ms = (unsigned long)(i * dt * 1000.0f);

        ImuData raw   = simulateImu(time_ms);
        ImuData filt  = applyLowPassFilter(raw, lpf);
        float vm_raw  = computeVMAccel(filt);
        float vm      = applyHighPassFilter(vm_raw, dt, 0.5f, vm_hpf);

        addSample(window, vm);
        float variance = computeVariance(window);

        // Motion interval detection
        if (MIDSV == 0) {
            consec_above = (variance > VAR_THRESHOLD) ? consec_above + 1 : 0;
            if (consec_above >= 10) { motion_start_ms = time_ms; MIDSV = 1; consec_above = 0; }
        } else {
            consec_below = (variance < VAR_THRESHOLD) ? consec_below + 1 : 0;
            if (consec_below >= 5) {
                recordMotionInterval(mlog, motion_start_ms, time_ms);
                MIDSV = 0; consec_below = 0;
            }
        }

        // Rep counting state machine
        bool is_local_max = (prev_vm > prev_prev_vm) && (prev_vm > vm);
        bool is_local_min = (prev_vm < prev_prev_vm) && (prev_vm < vm);
        bool in_motion    = (MIDSV == 1);

        if (!in_motion) {
            MCSV = 0;
        } else if (MCSV == 0 && is_local_max && prev_vm > 0.3f * VM_HIGH) {
            rep_start_ms = time_ms; MCSV = 1;
        } else if (MCSV == 1 && is_local_min && prev_vm < 0.3f * VM_LOW) {
            rep_deepest_ms = time_ms; MCSV = 2;
        } else if (MCSV == 2 && is_local_max && prev_vm > 0.3f * VM_HIGH) {
            if (rep_deepest_ms > rep_start_ms && time_ms > rep_deepest_ms) {
                rep_count++;
            }
            MCSV = 0;
        }

        prev_prev_vm = prev_vm;
        prev_vm      = vm;
    }
}
