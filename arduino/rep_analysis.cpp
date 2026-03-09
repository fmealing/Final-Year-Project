#include "rep_counting.cpp"

ImuData simulateImu(unsigned long time_ms) {
    float t = time_ms / 1000.0f;
    ImuData d;
    d.time_ms   = time_ms;
    d.acc.x     = 0.05f * sinf(2.0f * M_PI * 1.1f * t);
    d.acc.y     = 0.05f * cosf(2.0f * M_PI * 0.9f * t);
    d.acc.z     = 9.81f + 5.0f * sinf(2.0f * M_PI * 0.5f * t);
    d.gyro.x    = 0.0f;
    d.gyro.y    = 0.0f;
    d.gyro.z    = 0.0f;
    return d;
}

void runRepAnalysis() {
    LowPassFilter   lpf             = {{}, false};
    Integrator      vel_int         = {0.0f, false};
    Integrator      disp_int        = {0.0f, false};
    HighPassFilter  vel_hpf         = {0.0f, 0.0f, false};
    HighPassFilter  disp_hpf        = {0.0f, 0.0f, false};
    SlidingWindow   window          = {{}, 0, 0};

    const float     SAMPLE_HZ       = 50.0f;
    const float     dt              = 1.0f / SAMPLE_HZ;
    const float     MAX_THRESHOLD   = 0.15f;
    const float     MIN_THRESHOLD   = -0.15f;
    const int       TOTAL_SAMPLES   = 5000;

    int   MIDSV             = 0;
    int   consec_above      = 0;
    int   consec_below      = 0;
    unsigned long motion_start_ms = 0;
    MotionLog mlog          = {{}, 0};

    int   MCSV              = 0;
    int   rep_count         = 0;
    float prev_disp         = 0.0f;
    float prev_prev_disp    = 0.0f;
    unsigned long rep_start_ms   = 0;
    unsigned long rep_deepest_ms = 0;

    for (int i = 0; i < TOTAL_SAMPLES; i++) {
        unsigned long time_ms = (unsigned long)(i * dt * 1000.0f);

        ImuData raw         = simulateImu(time_ms);
        ImuData filtered    = applyLowPassFilter(raw, lpf);
        Vector3 global_acc  = ConvertToGlobalFrame(filtered);
        float vertical_acc  = ExtractVerticalComponent(global_acc);

        float velocity      = integrate(vertical_acc, dt, vel_int);
        velocity            = applyHighPassFilter(velocity, dt, cutoff_frequency_high_pass, vel_hpf);

        float displacement  = integrate(velocity, dt, disp_int);
        displacement        = applyHighPassFilter(displacement, dt, cutoff_frequency_high_pass, disp_hpf);

        addSample(window, displacement);
        float variance = computeVariance(window);

        // Motion Interval Detection State Variable (MIDSV)
        if (MIDSV == 0) {
            if (variance > VAR_THRESHOLD) consec_above++;
            else consec_above = 0;

            if (consec_above >= 10) {
                motion_start_ms = time_ms;
                MIDSV = 1;
                consec_above = 0;
            }
        } else if (MIDSV == 1) {
            if (variance < VAR_THRESHOLD) consec_below++;
            else consec_below = 0;

            if (consec_below >= 5) {
                recordMotionInterval(mlog, motion_start_ms, time_ms);
                MIDSV = 0;
                consec_below = 0;
            }
        }

        // Motion Counting State Variable (MCSV)
        bool is_local_max = (prev_disp > prev_prev_disp) && (prev_disp > displacement);
        bool is_local_min = (prev_disp < prev_prev_disp) && (prev_disp < displacement);

        if (MCSV == 0 && is_local_max && prev_disp > 0.3f * MAX_THRESHOLD) {
            rep_start_ms = time_ms;
            MCSV = 1;
        } else if (MCSV == 1 && is_local_min && prev_disp < 0.3f * MIN_THRESHOLD) {
            rep_deepest_ms = time_ms;
            MCSV = 2;
        } else if (MCSV == 2 && is_local_max && prev_disp > 0.3f * MAX_THRESHOLD) {
            if (rep_deepest_ms > rep_start_ms && time_ms > rep_deepest_ms) {
                rep_count++;
            }
            MCSV = 0;
        }

        prev_prev_disp = prev_disp;
        prev_disp = displacement;
    }
}
