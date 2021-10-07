#if !defined(_WIN32) && !defined(_WIN64)

#include <dlfcn.h>

#endif

#include <stdio.h>
#include <stdlib.h>

#if defined(_WIN32) || defined(_WIN64)

#include <windows.h>

#endif

#include "pv_octopus.h"

static void *pv_open_dl(const char *path) {

#if defined(_WIN32) || defined(_WIN64)

    return LoadLibrary(path);

#else

    return dlopen(path, RTLD_NOW);

#endif

}

static void *pv_load_sym(void *dl, const char *sym) {

#if defined(_WIN32) || defined(_WIN64)

    return GetProcAddress((HMODULE) dl, sym);

#else

    return dlsym(dl, sym);

#endif

}

static void pv_close_dl(void *dl) {

#if defined(_WIN32) || defined(_WIN64)

    FreeLibrary((HMODULE) dl);

#else

    dlclose(dl);

#endif

}

int main(int argc, char *argv[]) {
    if (argc != 6) {
        fprintf(stderr, "usage : %s dl_path model_path access_key index_path phrase\n", argv[0]);
        exit(1);
    }

    const char *dl_path = argv[1];
    const char *model_path = argv[2];
    const char *access_key = argv[3];
    const char *index_path = argv[4];
    const char *phrase = argv[5];

    void *dl = pv_open_dl(dl_path);
    if (!dl) {
        fprintf(stderr, "failed to open library.\n");
        exit(1);
    }

    const char *(*pv_status_to_string_func)(pv_status_t) = pv_load_sym(dl, "pv_status_to_string");
    if (!pv_status_to_string_func) {
        fprintf(stderr, "failed to load 'pv_status_to_string()'.\n");
        exit(1);
    }

    pv_status_t (*pv_octopus_init_func)(const char *, const char *, pv_octopus_t **) = pv_load_sym(dl, "pv_octopus_init");
    if (!pv_octopus_init_func) {
        fprintf(stderr, "failed to load 'pv_octopus_init()'.\n");
        exit(1);
    }

    void (*pv_octopus_delete_func)(pv_octopus_t *) = pv_load_sym(dl, "pv_octopus_delete");
    if (!pv_octopus_delete_func) {
        fprintf(stderr, "failed to load 'pv_octopus_delete()'.\n");
        exit(1);
    }

    pv_status_t (*pv_octopus_search_func)(
            pv_octopus_t *,
            const void *,
            int32_t,
            const char *,
            pv_octopus_match_t **,
            int32_t *) = pv_load_sym(dl, "pv_octopus_search");
    if (!pv_octopus_search_func) {
        fprintf(stderr, "failed to load 'pv_octopus_search()'.\n");
        exit(1);
    }

    const char (*pv_octopus_version_func)(const pv_octopus_t *) = pv_load_sym(dl, "pv_octopus_version");
    if (!pv_octopus_version_func) {
        fprintf(stderr, "failed to load 'pv_octopus_version()'.\n");
        exit(1);
    }

    pv_octopus_t *o = NULL;
    pv_status_t status = pv_octopus_init_func(access_key, model_path, &o);
    if (status != PV_STATUS_SUCCESS) {
        fprintf(stderr, "failed to init with '%s'.\n", pv_status_to_string_func(status));
        exit(1);
    }

    FILE *f = fopen(index_path, "rb");
    if (!f) {
        fprintf(stderr, "failed to open index file at '%s'.\n", index_path);
        exit(1);
    }

    fseek(f, 0, SEEK_END);
    const int32_t num_indices_byte = (int32_t) ftell(f);
    fseek(f, 0, SEEK_SET);
    void *indices = malloc(num_indices_byte);
    if (!indices) {
        fprintf(stderr, "failed to allocate '%d' bytes of memory for indices.\n", num_indices_byte);
        exit(1);
    }
    if (fread(indices, 1, num_indices_byte, f) != (size_t) num_indices_byte) {
        fprintf(stderr, "failed to read indices from '%s'.\n", index_path);
        exit(1);
    }

    fclose(f);

    pv_octopus_match_t *matches = NULL;
    int32_t num_matches = 0;
    status = pv_octopus_search_func(o, indices, num_indices_byte, phrase, &matches, &num_matches);
    if (status != PV_STATUS_SUCCESS) {
        fprintf(stderr, "failed to search with '%s'.\n", pv_status_to_string_func(status));
        exit(1);
    }

    free(indices);
    pv_octopus_delete_func(o);
    pv_close_dl(dl);

    fprintf(stdout, "# matches: %d\n", num_matches);
    for (int32_t i = 0; i < num_matches; i++) {
        fprintf(
                stdout,
                "[%d] .start_sec = %.1f .end_sec = %.1f .probability = %.2f\n",
                i,
                matches[i].start_sec,
                matches[i].end_sec,
                matches[i].probability);
    }

    free(matches);

    return 0;
}
