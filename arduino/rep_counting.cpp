struct Vector3 {
    float x, y, z;
};

struct ImuData {
    Vector3 acc; // g
    Vector3 gyro; // rad/s
    unsigned long time_ms; // millis()
};