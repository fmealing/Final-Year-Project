#pragma once
#define _USE_MATH_DEFINES
#include <cmath>
#include <algorithm>

/* -------------------- Constants -------------------- */
const int   cutoff_frequency_low_pass   = 10;       // Hz
const int   WINDOW_SAMPLES              = 100;      // 2s @ 50Hz
const int   MAX_INTERVALS               = 10;
const float cutoff_frequency_high_pass  = 0.5f;     // Hz
const float sensor_max_acc              = 19.62f;   // m/s^2, from sketch.ino
const float sensor_max_gyro             = 8.727f;   // rad/s, from sketch.ino
const float MADGWICK_BETA               = 0.1f;
const float VAR_THRESHOLD               = 0.30f;    // (m/s²)² — rest ≈0.02, curl ≈12

// MIDSV thresholds
const int   MIDSV_ENTER_MOTION_COUNT    = 10;       // consecutive high-var samples to enter MOTION
const int   MIDSV_EXIT_MOTION_COUNT     = 5;        // consecutive low-var samples to return to REST

// MCSV thresholds
const float MCSV_PEAK_THRESHOLD         = 0.45f;    // m/s² — minimum VM for a valid peak
const float MCSV_TROUGH_THRESHOLD       = -0.45f;   // m/s² — minimum VM for a valid trough

// IMU bias values (measured at 50 Hz over 20,000 samples, stationary)
const float BIAS_AX = -2.6284f;
const float BIAS_AY = -0.2492f;
const float BIAS_AZ = -0.0144f;
const float BIAS_GX = -0.1175f;
const float BIAS_GY =  0.0457f;
const float BIAS_GZ = -0.004f;

/* -------------------- Custom Types -------------------- */
struct Vector3 {
    float x, y, z;
};

struct ImuData {
    Vector3 acc;            // m/s^2
    Vector3 gyro;           // rad/s
    unsigned long time_ms;  // millis()
};

struct LowPassFilter {
    ImuData last_output;
    bool initialised;
};

struct HighPassFilter {
    float last_input;
    float last_output;
    bool initialised;
};

struct Quaternion {
    float w, x, y, z;
};

struct Integrator {
    float value;
    bool initialised;
};

struct SlidingWindow {
    float buffer[WINDOW_SAMPLES];
    int head;
    int count;
};

struct MotionInterval {
    unsigned long start_ms;
    unsigned long end_ms;
};

struct MotionLog {
    MotionInterval intervals[MAX_INTERVALS];
    int count;
};

/* -------------------- MIDSV State -------------------- */
enum MidsvState { MIDSV_REST, MIDSV_MOTION };

/* -------------------- MCSV State -------------------- */
enum McsvState { MCSV_IDLE, MCSV_ASCENDING, MCSV_DESCENDING };

/* -------------------- Helper Functions -------------------- */
static float clamp(float x, float low, float high) {
    return x < low ? low : (x > high ? high : x);
}

Quaternion conjugate(Quaternion q) {
    return {q.w, -q.x, -q.y, -q.z};
}

Quaternion multiplyQuarternions(Quaternion a, Quaternion b) {
    return {
        a.w*b.w - a.x*b.x - a.y*b.y - a.z*b.z,
        a.w*b.x + a.x*b.w + a.y*b.z - a.z*b.y,
        a.w*b.y - a.x*b.z + a.y*b.w + a.z*b.x,
        a.w*b.z + a.x*b.y - a.y*b.x + a.z*b.w
    };
}

/* -------------------- Action Functions -------------------- */

/*
 * Subtract calibrated bias values from raw IMU data
 * Input:  ImuData raw
 * Output: ImuData with bias removed
 */
ImuData applyBiasCorrection(ImuData current) {
    current.acc.x  -= BIAS_AX;
    current.acc.y  -= BIAS_AY;
    current.acc.z  -= BIAS_AZ;
    current.gyro.x -= BIAS_GX;
    current.gyro.y -= BIAS_GY;
    current.gyro.z -= BIAS_GZ;
    return current;
}

/*
 * Apply a low-pass filter to IMU data
 * Equation: filtered[n] = alpha * x[n] + (1 - alpha) * filtered[n-1]
 * Constants: cutoff_frequency_low_pass
 */
ImuData applyLowPassFilter(ImuData current, LowPassFilter &filter) {
    if (!filter.initialised) {
        filter.last_output = current;
        filter.initialised = true;
        return current;
    }

    float dt = (current.time_ms - filter.last_output.time_ms) / 1000.0f;
    float RC = 1.0f / (2.0f * M_PI * cutoff_frequency_low_pass);
    float alpha = dt / (dt + RC);

    ImuData filtered;
    filtered.time_ms = current.time_ms;

    filtered.acc.x = alpha * current.acc.x + (1 - alpha) * filter.last_output.acc.x;
    filtered.acc.y = alpha * current.acc.y + (1 - alpha) * filter.last_output.acc.y;
    filtered.acc.z = alpha * current.acc.z + (1 - alpha) * filter.last_output.acc.z;

    filtered.gyro.x = alpha * current.gyro.x + (1 - alpha) * filter.last_output.gyro.x;
    filtered.gyro.y = alpha * current.gyro.y + (1 - alpha) * filter.last_output.gyro.y;
    filtered.gyro.z = alpha * current.gyro.z + (1 - alpha) * filter.last_output.gyro.z;

    filter.last_output = filtered;
    return filtered;
}

/*
 * Normalise IMU data to [-1, 1]
 * Equation: normalised = clamp(x / sensor_max, -1, 1)
 */
ImuData normaliseImu(ImuData current) {
    ImuData normalised;

    normalised.acc.x = clamp(current.acc.x / sensor_max_acc, -1.0f, 1.0f);
    normalised.acc.y = clamp(current.acc.y / sensor_max_acc, -1.0f, 1.0f);
    normalised.acc.z = clamp(current.acc.z / sensor_max_acc, -1.0f, 1.0f);

    normalised.gyro.x = clamp(current.gyro.x / sensor_max_gyro, -1.0f, 1.0f);
    normalised.gyro.y = clamp(current.gyro.y / sensor_max_gyro, -1.0f, 1.0f);
    normalised.gyro.z = clamp(current.gyro.z / sensor_max_gyro, -1.0f, 1.0f);

    normalised.time_ms = current.time_ms;
    return normalised;
}

/*
 * Apply a high-pass filter to a scalar signal
 * Equation: filtered[n] = alpha * (filtered[n-1] + x[n] - x[n-1])
 * where alpha = RC / (RC + dt), RC = 1 / (2 * pi * cutoff_hz)
 */
float applyHighPassFilter(float input, float dt, float cutoff_hz, HighPassFilter &filter) {
    if (!filter.initialised) {
        filter.last_input  = input;
        filter.last_output = 0.0f;
        filter.initialised = true;
        return 0.0f;
    }

    float RC = 1.0f / (2.0f * M_PI * cutoff_hz);
    float alpha = RC / (RC + dt);
    float output = alpha * (filter.last_output + input - filter.last_input);

    filter.last_input  = input;
    filter.last_output = output;
    return output;
}

/*
 * Compute vector-magnitude acceleration centred on 1g
 * Output: sqrt(ax² + ay² + az²) − 9.81, ≈ 0 when stationary
 */
float computeVMAccel(ImuData current) {
    float ax = current.acc.x, ay = current.acc.y, az = current.acc.z;
    return sqrtf(ax*ax + ay*ay + az*az) - 9.81f;
}

/*
 * Add a sample to the sliding window ring buffer
 */
void addSample(SlidingWindow &window, float value) {
    window.buffer[window.head] = value;
    window.head = (window.head + 1) % WINDOW_SAMPLES;
    if (window.count < WINDOW_SAMPLES) window.count++;
}

/*
 * Compute variance over the sliding window
 * Equation: Var = (1/N) * Sum(x_i - mean)^2
 */
float computeVariance(SlidingWindow &window) {
    if (window.count == 0) return 0.0f;

    float sum = 0.0f;
    for (int i = 0; i < window.count; i++) sum += window.buffer[i];
    float mean = sum / window.count;

    float sq_sum = 0.0f;
    for (int i = 0; i < window.count; i++) {
        float diff = window.buffer[i] - mean;
        sq_sum += diff * diff;
    }
    return sq_sum / window.count;
}

/*
 * MIDSV — Motion Interval Detection State Variable
 *
 * 2-state machine: REST <-> MOTION
 * Transitions:
 *   REST   -> MOTION : 10 consecutive high-variance samples (200 ms)
 *   MOTION -> REST   : 5  consecutive low-variance samples  (100 ms)
 *
 * High variance: > VAR_THRESHOLD (0.30)
 * Low  variance: <= VAR_THRESHOLD
 *
 * Returns: true if currently in MOTION state
 */
bool updateMIDSV(float variance) {
    static MidsvState state          = MIDSV_REST;
    static int        consecutive    = 0;

    bool high = (variance > VAR_THRESHOLD);

    switch (state) {
        case MIDSV_REST:
            if (high) {
                consecutive++;
                if (consecutive >= MIDSV_ENTER_MOTION_COUNT) {
                    state       = MIDSV_MOTION;
                    consecutive = 0;
                }
            } else {
                consecutive = 0;
            }
            break;

        case MIDSV_MOTION:
            if (!high) {
                consecutive++;
                if (consecutive >= MIDSV_EXIT_MOTION_COUNT) {
                    state       = MIDSV_REST;
                    consecutive = 0;
                }
            } else {
                consecutive = 0;
            }
            break;
    }

    return (state == MIDSV_MOTION);
}

/*
 * MCSV — Motion Counting State Variable
 *
 * 3-state machine: IDLE -> ASCENDING -> DESCENDING -> IDLE (rep counted)
 *
 * Local maxima detected when: prev_prev < prev > current  AND prev > MCSV_PEAK_THRESHOLD
 * Local minima detected when: prev_prev > prev < current  AND prev < MCSV_TROUGH_THRESHOLD
 *
 * State transitions:
 *   IDLE        -> ASCENDING   : local maxima above +0.45 m/s²
 *   ASCENDING   -> DESCENDING  : local minima below -0.45 m/s²
 *   DESCENDING  -> IDLE        : local maxima above +0.45 m/s² (rep counted)
 *
 * Resets to IDLE whenever in_motion is false.
 *
 * Returns: updated rep count
 */
uint32_t updateMCSV(float vm, bool in_motion, uint32_t rep_count) {
    static McsvState state    = MCSV_IDLE;
    static float     prev     = 0.0f;
    static float     prev_prev= 0.0f;

    // Gate — reset if MIDSV says we're at rest
    if (!in_motion) {
        state     = MCSV_IDLE;
        prev      = 0.0f;
        prev_prev = 0.0f;
        return rep_count;
    }

    bool local_max = (prev > prev_prev) && (prev > vm) && (prev >  MCSV_PEAK_THRESHOLD);
    bool local_min = (prev < prev_prev) && (prev < vm) && (prev <  MCSV_TROUGH_THRESHOLD);

    switch (state) {
        case MCSV_IDLE:
            if (local_max) state = MCSV_ASCENDING;
            break;

        case MCSV_ASCENDING:
            if (local_min) state = MCSV_DESCENDING;
            break;

        case MCSV_DESCENDING:
            if (local_max) {
                rep_count++;
                state = MCSV_IDLE;
            }
            break;
    }

    prev_prev = prev;
    prev      = vm;
    return rep_count;
}

/*
 * updateRepCount — top-level pipeline entry point
 *
 * Pipeline:
 *   raw ImuData
 *     -> bias correction
 *     -> low-pass filter  (10 Hz)
 *     -> VM acceleration  (orientation-independent scalar)
 *     -> high-pass filter (0.5 Hz, removes DC offset)
 *     -> sliding variance (100-sample window)
 *     -> MIDSV            (REST / MOTION gating)
 *     -> MCSV             (rep counting)
 *
 * Input:  ImuData raw — fresh sample from MPU6050
 * Output: uint32_t — current rep count
 */
uint32_t updateRepCount(ImuData raw) {
    static LowPassFilter  lpf        = {.initialised = false};
    static HighPassFilter hpf        = {.initialised = false};
    static SlidingWindow  window     = {.head = 0, .count = 0};
    static uint32_t       rep_count  = 0;

    // 1. Bias correction
    ImuData corrected = applyBiasCorrection(raw);

    // 2. Low-pass filter
    ImuData filtered = applyLowPassFilter(corrected, lpf);

    // 3. VM acceleration
    float vm_raw = computeVMAccel(filtered);

    // 4. High-pass filter (dt from timestamps)
    float dt = (raw.time_ms - (raw.time_ms)) / 1000.0f; // placeholder; real dt below
    {
        static unsigned long last_ms = 0;
        dt = (last_ms == 0) ? 0.02f : (raw.time_ms - last_ms) / 1000.0f;
        last_ms = raw.time_ms;
    }
    float vm = applyHighPassFilter(vm_raw, dt, cutoff_frequency_high_pass, hpf);

    // 5. Sliding variance
    addSample(window, vm);
    float variance = computeVariance(window);

    // 6. MIDSV
    bool in_motion = updateMIDSV(variance);

    // 7. MCSV
    rep_count = updateMCSV(vm, in_motion, rep_count);

    return rep_count;
}
