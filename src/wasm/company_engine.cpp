#include <emscripten/emscripten.h>
#include <set>
#include <sstream>
#include <string>
#include <vector>

static std::vector<std::string> split_line(const std::string& line) {
    std::vector<std::string> fields;
    std::string field;
    bool quoted = false;
    for (size_t i = 0; i < line.size(); ++i) {
        char c = line[i];
        if (c == '"') quoted = !quoted;
        else if (c == ',' && !quoted) { fields.push_back(field); field.clear(); }
        else field += c;
    }
    fields.push_back(field);
    return fields;
}

extern "C" {

EMSCRIPTEN_KEEPALIVE
int count_missing_coordinates(const char* csv_text) {
    std::stringstream input(csv_text ? csv_text : "");
    std::string line;
    int missing = 0;
    while (std::getline(input, line)) {
        if (line.empty()) continue;
        auto fields = split_line(line);
        if (fields.size() < 4) { missing++; continue; }
        try {
            std::stod(fields[2]);
            std::stod(fields[3]);
        } catch (...) {
            missing++;
        }
    }
    return missing;
}

EMSCRIPTEN_KEEPALIVE
int count_duplicate_names(const char* csv_text) {
    std::stringstream input(csv_text ? csv_text : "");
    std::string line;
    std::set<std::string> seen;
    int duplicates = 0;
    while (std::getline(input, line)) {
        if (line.empty()) continue;
        auto fields = split_line(line);
        if (fields.empty()) continue;
        std::string name = fields[0];
        for (char& c : name) c = static_cast<char>(tolower(c));
        if (seen.count(name)) duplicates++;
        else seen.insert(name);
    }
    return duplicates;
}

}
