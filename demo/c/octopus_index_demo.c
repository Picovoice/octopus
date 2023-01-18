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
        {"audio_path",                  required_argument, NULL, 'w'},
        {"index_path",                  required_argument, NULL, 'i'},
};

void print_usage(const char *program_name) {
    fprintf(
        stderr,
        "usage : %s -l LIBRARY_PATH -m MODEL_PATH -a ACCESS_KEY -w AUDIO_PATH -i INDEX_PATH\n",
        program_name);
}

int picovoice_main(int argc, char *argv[]) {
    const char *library_path = NULL;
    const char *model_path = NULL;
    const char *access_key = NULL;
    const char *audio_path = NULL;
    const char *index_path = NULL;

    int c;
    while ((c = getopt_long(argc, argv, "l:m:a:w:i:", long_options, NULL)) != -1) {
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
            case 'w':
                audio_path = optarg;
                break;
            case 'i':
                index_path = optarg;
                break;
            default:
                exit(1);
        }
    }

    if (!library_path || !model_path || !audio_path || !access_key || !index_path) {
        print_usage(argv[0]);
        exit(1);
    }

    void *dl = pv_open_dl(library_path);
    if (!dl) {
        fprintf(stderr, "failed to open library.\n");
        exit(1);
    }

    const char *(*pv_status_to_string_func)(pv_status_t) = pv_load_sym(dl, "pv_status_to_string");
    if (!pv_status_to_string_func) {
        print_dl_error("failed to load 'pv_status_to_string'");
        exit(1);
    }

    pv_status_t (*pv_octopus_init_func)(const char *, const char *, pv_octopus_t **) = pv_load_sym(dl, "pv_octopus_init");
    if (!pv_octopus_init_func) {
        print_dl_error("failed to load 'pv_octopus_init()'.");
        exit(1);
    }

    void (*pv_octopus_delete_func)(pv_octopus_t *) = pv_load_sym(dl, "pv_octopus_delete");
    if (!pv_octopus_delete_func) {
        print_dl_error("failed to load 'pv_octopus_delete()'");
        exit(1);
    }

    pv_status_t (*pv_octopus_index_file_func)(pv_octopus_t *, const char *, void **, int32_t *) = NULL;
    pv_octopus_index_file_func = pv_load_sym(dl, "pv_octopus_index_file");
    if (!pv_octopus_index_file_func) {
        print_dl_error("failed to load 'pv_octopus_index_file()'");
        exit(1);
    }

    const char (*pv_octopus_version_func)(const pv_octopus_t *) = pv_load_sym(dl, "pv_octopus_version");
    if (!pv_octopus_version_func) {
        print_dl_error("failed to load 'pv_octopus_version()'");
        exit(1);
    }

    pv_octopus_t *o = NULL;
    pv_status_t status = pv_octopus_init_func(access_key, model_path, &o);
    if (status != PV_STATUS_SUCCESS) {
        perror("failed to init");
        fprintf(stderr, "failed to init with '%s'.\n", pv_status_to_string_func(status));
        exit(1);
    }

    double total_cpu_time_usec = 0;

    void *indices = NULL;
    int32_t num_indices_byte = 0;

    struct timeval before;
    gettimeofday(&before, NULL);

    status = pv_octopus_index_file_func(o, audio_path, &indices, &num_indices_byte);
    if (status != PV_STATUS_SUCCESS) {
        fprintf(stderr, "failed to index with '%s'.\n", pv_status_to_string_func(status));
        exit(1);
    }

    struct timeval after;
    gettimeofday(&after, NULL);

    total_cpu_time_usec +=
            (double) (after.tv_sec - before.tv_sec) * 1e6 + (double) (after.tv_usec - before.tv_usec);

    pv_octopus_delete_func(o);
    pv_close_dl(dl);

    FILE *f = fopen(index_path, "wb");
    if (!f) {
        fprintf(stderr, "failed to create index file at '%s'.\n", index_path);
        exit(1);
    }

    if (fwrite(indices, 1, num_indices_byte, f) != (size_t) num_indices_byte) {
        fprintf(stderr, "failed to write into index file at '%s'.\n", index_path);
        exit(1);
    }

    fclose(f);
    free(indices);

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
