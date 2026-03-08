#define _USE_MATH_DEFINES
#include <cmath>
#include <algorithm>

/* -------------------- Constants -------------------- */
const int cutoffFrequency    = 10;    // Hz
const float sensor_max_acc   = 19.62; // m/s^2, from sketch.ino
const float sensor_max_gyro  = 8.727; // rad/s, from sketch.ino
const float MADGWICK_BETA    = 0.1f;

/* -------------------- Custum Types -------------------- */
struct Vector3 {
    float x, y, z;
};

struct ImuData {
    Vector3 acc; // g
    Vector3 gyro; // rad/s
    unsigned long time_ms; // millis()
};

struct LowPassFilter {
    ImuData last_output;
    bool initialised;
};

struct Quaternion {
    float w, x, y, z;
};

struct Integrator { 
    float value; // Accumulated output
    bool initialised;
};

/* -------------------- HELPER FUNCTIONS -------------------- */
// Helper function to clamp values between lo and hi
static float clamp(float x, float low, float high) {
    return x < low ? low : (x > high ? high : x);
}

// Helper function to undo the rotation with a conjugate
Quaternion conjugate(Quaternion q){
    return {q.w, -q.x, -q.y, -q.z};
}

// Helper function to rotate quarternions
Quaternion multiplyQuarternions(Quaternion a, Quaternion b) {
    return {
        a.w*b.w - a.x*b.x - a.y*b.y - a.z*b.z,  // w
        a.w*b.x + a.x*b.w + a.y*b.z - a.z*b.y,  // x
        a.w*b.y - a.x*b.z + a.y*b.w + a.z*b.x,  // y
        a.w*b.z + a.x*b.y - a.y*b.x + a.z*b.w   // z
    };
}

/*
 * Update the Madgwick orientation filter
 * Input:  Quaternion q (current orientation, updated in place)
 *         ImuData current (acc in m/s^2, gyro in rad/s)
 *         float dt (time since last call in seconds)
 * Output: void — updates q directly via reference
 *
 * Steps:
 * 1. Normalise acc to a unit vector (direction of gravity only)
 * 2. Compute gradient — how far q is from the true orientation using acc as reference
 * 3. Integrate gyro to predict how q should change
 * 4. Apply correction (beta * gradient) and step forward by dt
 * 5. Renormalise q to keep it unit-length
 *
 * Constants required:
 * - MADGWICK_BETA (float) — filter gain (0.1 = balanced gyro/acc trust)
*/
void updateMadgwick(Quaternion &q, ImuData current, float dt){
    float ax = current.acc.x, ay = current.acc.y, az = current.acc.z;
    float gx = current.gyro.x, gy = current.gyro.y, gz = current.gyro.z;

    // Normalise accelerometer (skip update if acc is zero)
    float acc_magnitute = sqrt(ax*ax + ay*ay + az*az);
    if (acc_magnitute == 0.0f) return;
    ax /= acc_magnitute;
    ay /= acc_magnitute;
    az /= acc_magnitute;

    // Gratient (how much to correct q based on acc error)
    // Derived from Madgwick 2010, equation 25
    float f1 = 2.0f*(q.x*q.z - q.w*q.y) - ax;
    float f2 = 2.0f*(q.w*q.x + q.y*q.z) - ay;
    float f3 = 2.0f*(0.5f - q.x*q.x - q.y*q.y) - az;

    float s_w = -2.0f*q.y*f1 + 2.0f*q.x*f2;
    float s_x =  2.0f*q.z*f1 + 2.0f*q.w*f2 - 4.0f*q.x*f3;
    float s_y = -2.0f*q.w*f1 + 2.0f*q.z*f2 - 4.0f*q.y*f3;
    float s_z =  2.0f*q.x*f1 + 2.0f*q.y*f2;

    // Normalise the gradient
    float s_mag = sqrt(s_w*s_w + s_x*s_x + s_y*s_y + s_z*s_z);
    if (s_mag != 0.0f) { s_w /= s_mag; s_x /= s_mag; s_y /= s_mag; s_z /= s_mag; }

    // Gyro expressed as a rate-of-change of 1 (Madgwick equation 12)
    float q_dot_w = 0.5f*(-q.x*gx - q.y*gy - q.z*gz);
    float q_dot_x = 0.5f*( q.w*gx + q.y*gz - q.z*gy);
    float q_dot_y = 0.5f*( q.w*gy - q.x*gz + q.z*gx);
    float q_dot_z = 0.5f*( q.w*gz + q.x*gy - q.y*gx);

    // Apply correction & Integrate 
    // Subtract the acc gradient (scaled by beta) then step forward by dt
    q.w += (q_dot_w - MADGWICK_BETA * s_w) * dt;
    q.x += (q_dot_x - MADGWICK_BETA * s_x) * dt;
    q.y += (q_dot_y - MADGWICK_BETA * s_y) * dt;
    q.z += (q_dot_z - MADGWICK_BETA * s_z) * dt;

    // Renormalise q
    // Quarternion must stay unit-length
    float q_magnitude = sqrt(q.w*q.w + q.x*q.x + q.y*q.y +q.z*q.z);
    q.w /= q_magnitude;
    q.x /= q_magnitude;
    q.y /= q_magnitude;
    q.z /= q_magnitude;
}

/*
 * Function that applies a low pass filter to data from an IMU
 * Inputs: current IMU data, the previous LowPassFilter result
 * Output: value of sensor with low-pass-filter
 * 
 * Equation: filtered[n] = alpha  * x[n] + (1 - alpha) * filtered[n-1]
 * where
 * - x[n] = current raw sample 
 * - filtered[n-1] = previous filtered output
 * - alpha = dt / (dt + RC)
 * - RC = 1 / (2 * pi * cuttoffFrequency)
*/
ImuData applyLowPassFilter(ImuData current, LowPassFilter &filter) {
    // If the filter hasn't been initialised, just return the current data
    if (!filter.initialised) {
        filter.last_output = current;
        filter.initialised = true;
        return current;
    }

    // Caluclating the alpha value
    float dt = (current.time_ms - filter.last_output.time_ms) / 1000.0f;
    float RC = 1.0f / (2.0f * M_PI * cutoffFrequency);
    float alpha = dt / (dt + RC);

    // Initialise the filtered ImuData value and populate with the filtered data (see equation)
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
 * Input:  ImuData current (acc in m/s^2, gyro in rad/s)
 * Output: ImuData with all fields clamped and scaled to [-1, 1]
 *
 * Equation: normalised = clamp(x / sensor_max, -1, 1)
 * where
 * - sensor_max for acc  = 19.62 m/s^2  (±2g,      MPU6050_RANGE_2_G,   set in sketch.ino)
 * - sensor_max for gyro = 8.727 rad/s  (±500°/s,  MPU6050_RANGE_500_DEG, set in sketch.ino)
 *
 * Constants required:
 * - sensor_max_acc  (float) — must match setAccelerometerRange() in sketch.ino
 * - sensor_max_gyro (float) — must match setGyroRange() in sketch.ino
 *
 * Helper required:
 * - clamp(x, lo, hi) — guards against noise spikes pushing values outside [-1, 1]
*/
ImuData normaliseImu(ImuData current){
    ImuData normalised;

    // Acceleration
    normalised.acc.x = clamp(current.acc.x / sensor_max_acc, -1.0f, 1.0f);
    normalised.acc.y = clamp(current.acc.y / sensor_max_acc, -1.0f, 1.0f);
    normalised.acc.z = clamp(current.acc.z / sensor_max_acc, -1.0f, 1.0f);

    // Gyro
    normalised.gyro.x = clamp(current.gyro.x / sensor_max_gyro, -1.0f, 1.0f);
    normalised.gyro.y = clamp(current.gyro.y / sensor_max_gyro, -1.0f, 1.0f);
    normalised.gyro.z = clamp(current.gyro.z / sensor_max_gyro, -1.0f, 1.0f);

    // Time
    normalised.time_ms = current.time_ms;

    return normalised;
}

/*
 * Convert IMU acceleration from local sensor frame to global world frame
 * Input:  ImuData current (acc in m/s^2, gyro in rad/s)
 * Output: Vector3 — acceleration in the global frame (m/s^2)
 *
 * Uses the Madgwick filter to fuse acc + gyro into an orientation quaternion,
 * then rotates the acceleration vector into the world frame and removes gravity.
 *
 * Steps:
 * 1. Update Madgwick filter with current acc + gyro → orientation quaternion q
 * 2. Rotate acc vector using q: global_acc = q * acc * q_conjugate
 * 3. Subtract gravity: global_acc.z -= 9.81 (world Z is up)
 *
 * Constants required:
 * - MADGWICK_BETA (float) — filter gain, controls gyro/acc trust balance (typical: 0.1)
 *
 * State required (persists between calls):
 * - Quaternion q {w, x, y, z} — current orientation estimate, initialised to {1,0,0,0}
 *
 * Helper required:
 * - A Quaternion struct with multiply and conjugate operations
*/
Vector3 ConvertToGlobalFrame (ImuData current){
    // q and previous timestamp must survive between calls, so they're static
    static Quaternion q = {1.0f, 0.0f, 0.0f, 0.0f}; // identity = no rotation
    static unsigned long last_time_ms = 0;

    float dt = (current.time_ms - last_time_ms) / 1000.0f;
    last_time_ms = current.time_ms;

    updateMadgwick(q, current, dt);

    // Rotate acc into world frame
    // Treat the acc vector as a quaternion with w=0, then apply q * acc_q * q_conjugate
    Quaternion acc_q = {0, current.acc.x, current.acc.y, current.acc.z};
    Quaternion rotated = multiplyQuarternions(multiplyQuarternions(q, acc_q), conjugate(q));

    // Strip gravity and return
    return {rotated.x, rotated.y, rotated.z - 9.81f};
}

/*
 * Extract the vertical (Z) component from a global-frame acceleration vector
 * Input:  Vector3 global_acc — acceleration in world frame (m/s^2), gravity already removed
 * Output: float — vertical acceleration (m/s^2), positive = upward
*/
float ExtractVerticalComponent(Vector3 global_acc) {
    return global_acc.z;
}

/*
 * Numerically integrate a scalar value over time (Euler method)
 * Input:   float input - value to integrate (e.g. acceleration or velocity)
 *          float dt    - time since last call in seconds
 *          Integrator & integrator - persistent state (updated in place)
 * Output:  float - accumulated integral (e.g. velocity or displacement)
 * 
 * Equation: output[n] = output[n-1] + input * dt
*/
float integrate (float input, float dt, Integrator &integrator){
    if (!integrator.initialised){
        integrator.value = 0.0f;
        integrator.initialised = true;
    }
    integrator.value += input * dt;
}