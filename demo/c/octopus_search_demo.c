#include <getopt.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/time.h>

#if defined(_WIN32) || defined(_WIN64)

#include <windows.h>

#else

#include <dlfcn.h>

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

static void print_dl_error(const char *message) {

#if defined(_WIN32) || defined(_WIN64)

    fprintf(stderr, "%s with code '%lu'.\n", message, GetLastError());

#else

    fprintf(stderr, "%s with '%s'.\n", message, dlerror());

#endif

}

static struct option long_options[] = {
        {"library_path",                required_argument, NULL, 'l'},
        {"model_path",                  required_argument, NULL, 'm'},
        {"access_key",                  required_argument, NULL, 'a'},
        {"index_path",                  required_argument, NULL, 'i'},
        {"search_phrase",               required_argument, NULL, 's'},
};

void print_usage(const char *program_name) {
    fprintf(
        stderr,
        "usage : %s -l LIBRARY_PATH -m MODEL_PATH -a ACCESS_KEY -i INDEX_PATH -s SEARCH_PHRASE\n",
        program_name);
}

int picovoice_main(int argc, char *argv[]) {
    const char *library_path = NULL;
    const char *model_path = NULL;
    const char *access_key = NULL;
    const char *index_path = NULL;
    const char *search_phrase = NULL;

    int c;
    while ((c = getopt_long(argc, argv, "l:m:a:i:s:", long_options, NULL)) != -1) {
        switch (c) {
            case 'l':
                library_path = optarg;
                break;
            case 'm':
                model_path = optarg;
                break;
            case 'a':
                access_key = optarg;
                break;
            case 'i':
                index_path = optarg;
                break;
            case 's':
                search_phrase = optarg;
                break;
            default:
                exit(1);
        }
    }

    if (!library_path || !model_path || !search_phrase || !access_key || !index_path) {
        print_usage(argv[0]);
        exit(1);
    }

    void *dl = pv_open_dl(library_path);
    if (!dl) {
        print_dl_error("Failed to open library");
        exit(1);
    }

    const char *(*pv_status_to_string_func)(pv_status_t) = pv_load_sym(dl, "pv_status_to_string");
    if (!pv_status_to_string_func) {
        print_dl_error("Failed to load symbol 'pv_status_to_string'");
        exit(1);
    }

    pv_status_t (*pv_octopus_init_func)(const char *, const char *, pv_octopus_t **) = pv_load_sym(dl, "pv_octopus_init");
    if (!pv_octopus_init_func) {
        print_dl_error("Failed to load symbol 'pv_octopus_init'");
        exit(1);
    }

    void (*pv_octopus_delete_func)(pv_octopus_t *) = pv_load_sym(dl, "pv_octopus_delete");
    if (!pv_octopus_delete_func) {
        print_dl_error("Failed to load symbol 'pv_octopus_delete'");
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
        print_dl_error("Failed to load symbol 'pv_octopus_search'");
        exit(1);
    }

    const char (*pv_octopus_version_func)(const pv_octopus_t *) = pv_load_sym(dl, "pv_octopus_version");
    if (!pv_octopus_version_func) {
        print_dl_error("Failed to load symbol 'pv_octopus_version'");
        exit(1);
    }

    void (*pv_free_func)(void *) = pv_load_sym(dl, "pv_free");
    if (!pv_free_func) {
        print_dl_error("failed to load `pv_free`");
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

    double total_cpu_time_usec = 0;

    pv_octopus_match_t *matches = NULL;
    int32_t num_matches = 0;

    struct timeval before;
    gettimeofday(&before, NULL);

    status = pv_octopus_search_func(o, indices, num_indices_byte, search_phrase, &matches, &num_matches);
    if (status != PV_STATUS_SUCCESS) {
        fprintf(stderr, "failed to search with '%s'.\n", pv_status_to_string_func(status));
        exit(1);
    }

    struct timeval after;
    gettimeofday(&after, NULL);

    total_cpu_time_usec +=
        (double) (after.tv_sec - before.tv_sec) * 1e6 + (double) (after.tv_usec - before.tv_usec);

    free(indices);
    pv_octopus_delete_func(o);

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

    pv_free_func(matches);
    pv_close_dl(dl);

    return 0;
}

int main(int argc, char *argv[]) {

#if defined(_WIN32) || defined(_WIN64)

#define UTF8_COMPOSITION_FLAG (0)
#define NULL_TERMINATED (-1)

    LPWSTR *wargv = CommandLineToArgvW(GetCommandLineW(), &argc);
    if (wargv == NULL) {
        fprintf(stderr, "CommandLineToArgvW failed\n");
        exit(1);
    }

    char *utf8_argv[argc];

    for (int i = 0; i < argc; ++i) {
        // WideCharToMultiByte: https://docs.microsoft.com/en-us/windows/win32/api/stringapiset/nf-stringapiset-widechartomultibyte
        int arg_chars_num = WideCharToMultiByte(CP_UTF8, UTF8_COMPOSITION_FLAG, wargv[i], NULL_TERMINATED, NULL, 0, NULL, NULL);
        utf8_argv[i] = (char *) malloc(arg_chars_num * sizeof(char));
        if (!utf8_argv[i]) {
            fprintf(stderr, "failed to to allocate memory for converting args");
        }
        WideCharToMultiByte(CP_UTF8, UTF8_COMPOSITION_FLAG, wargv[i], NULL_TERMINATED, utf8_argv[i], arg_chars_num, NULL, NULL);
    }

    LocalFree(wargv);
    argv = utf8_argv;

#endif

    int result = picovoice_main(argc, argv);

#if defined(_WIN32) || defined(_WIN64)

    for (int i = 0; i < argc; ++i) {
        free(utf8_argv[i]);
    }

#endif

    return result;
}
