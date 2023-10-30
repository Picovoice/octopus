#include <getopt.h>
#include <stdio.h>
#include <stdlib.h>

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
        {"library_path",  required_argument, NULL, 'l'},
        {"model_path",    required_argument, NULL, 'm'},
        {"access_key",    required_argument, NULL, 'a'},
        {"index_path",    required_argument, NULL, 'i'},
        {"search_phrase", required_argument, NULL, 's'},
};

static void print_usage(const char *program_name) {
    fprintf(
            stderr,
            "usage : %s -l LIBRARY_PATH -m MODEL_PATH -a ACCESS_KEY -i INDEX_PATH -s SEARCH_PHRASE\n",
            program_name);
}

static void print_error_message(char **message_stack, int32_t message_stack_depth) {
    for (int32_t i = 0; i < message_stack_depth; i++) {
        fprintf(stderr, "  [%d] %s\n", i, message_stack[i]);
    }
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
                exit(EXIT_FAILURE);
        }
    }

    if (!library_path || !model_path || !search_phrase || !access_key || !index_path) {
        print_usage(argv[0]);
        exit(EXIT_FAILURE);
    }

    void *dl = pv_open_dl(library_path);
    if (!dl) {
        print_dl_error("Failed to open library");
        exit(EXIT_FAILURE);
    }

    const char *(*pv_status_to_string_func)(pv_status_t) = pv_load_sym(dl, "pv_status_to_string");
    if (!pv_status_to_string_func) {
        print_dl_error("Failed to load symbol 'pv_status_to_string'");
        exit(EXIT_FAILURE);
    }

    pv_status_t
    (*pv_octopus_init_func)(const char *, const char *, pv_octopus_t **) = pv_load_sym(dl, "pv_octopus_init");
    if (!pv_octopus_init_func) {
        print_dl_error("Failed to load symbol 'pv_octopus_init'");
        exit(EXIT_FAILURE);
    }

    void (*pv_octopus_delete_func)(pv_octopus_t *) = pv_load_sym(dl, "pv_octopus_delete");
    if (!pv_octopus_delete_func) {
        print_dl_error("Failed to load symbol 'pv_octopus_delete'");
        exit(EXIT_FAILURE);
    }

    void (*pv_octopus_matches_delete_func)(pv_octopus_match_t *) = pv_load_sym(dl, "pv_octopus_matches_delete");
    if (!pv_octopus_matches_delete_func) {
        print_dl_error("Failed to load symbol 'pv_octopus_matches_delete'");
        exit(EXIT_FAILURE);
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
        exit(EXIT_FAILURE);
    }

    const char (*pv_octopus_version_func)(const pv_octopus_t *) = pv_load_sym(dl, "pv_octopus_version");
    if (!pv_octopus_version_func) {
        print_dl_error("Failed to load symbol 'pv_octopus_version'");
        exit(EXIT_FAILURE);
    }

    pv_status_t (*pv_get_error_stack_func)(char ***, int32_t *) = pv_load_sym(dl, "pv_get_error_stack");
    if (!pv_get_error_stack_func) {
        print_dl_error("Failed to load 'pv_get_error_stack_func'");
        exit(EXIT_FAILURE);
    }

    void (*pv_free_error_stack_func)(char **) = pv_load_sym(dl, "pv_free_error_stack");
    if (!pv_free_error_stack_func) {
        print_dl_error("Failed to load 'pv_free_error_stack_func'");
        exit(EXIT_FAILURE);
    }

    pv_octopus_t *o = NULL;
    pv_status_t status = pv_octopus_init_func(access_key, model_path, &o);
    if (status != PV_STATUS_SUCCESS) {
        fprintf(stderr, "Failed to init with '%s'", pv_status_to_string_func(status));
        char **message_stack = NULL;
        int32_t message_stack_depth = 0;
        pv_status_t error_status = pv_get_error_stack_func(&message_stack, &message_stack_depth);
        if (error_status != PV_STATUS_SUCCESS) {
            fprintf(
                    stderr,
                    ".\nUnable to get Octopus error state with '%s'.\n",
                    pv_status_to_string_func(error_status));
            exit(EXIT_FAILURE);
        }

        if (message_stack_depth > 0) {
            fprintf(stderr, ":\n");
            print_error_message(message_stack, message_stack_depth);
            pv_free_error_stack_func(message_stack);
        }

        exit(EXIT_FAILURE);
    }

    FILE *f = fopen(index_path, "rb");
    if (!f) {
        fprintf(stderr, "Failed to open index file at '%s'.\n", index_path);
        exit(EXIT_FAILURE);
    }

    fseek(f, 0, SEEK_END);
    const int32_t num_indices_byte = (int32_t) ftell(f);
    fseek(f, 0, SEEK_SET);

    void *indices = calloc(num_indices_byte, sizeof(char));
    if (!indices) {
        fprintf(stderr, "Failed to allocate '%d' bytes of memory for indices.\n", num_indices_byte);
        exit(EXIT_FAILURE);
    }
    if (fread(indices, 1, num_indices_byte, f) != (size_t) num_indices_byte) {
        fprintf(stderr, "Failed to read indices from '%s'.\n", index_path);
        exit(EXIT_FAILURE);
    }

    fclose(f);

    pv_octopus_match_t *matches = NULL;
    int32_t num_matches = 0;

    status = pv_octopus_search_func(
            o,
            indices,
            num_indices_byte,
            search_phrase,
            &matches,
            &num_matches);
    if (status != PV_STATUS_SUCCESS) {
        fprintf(stderr, "Failed to search with '%s'", pv_status_to_string_func(status));
        char **message_stack = NULL;
        int32_t message_stack_depth = 0;
        pv_status_t error_status = pv_get_error_stack_func(&message_stack, &message_stack_depth);
        if (error_status != PV_STATUS_SUCCESS) {
            fprintf(
                    stderr,
                    ".\nUnable to get Octopus error state with '%s'.\n",
                    pv_status_to_string_func(error_status));
            exit(EXIT_FAILURE);
        }

        if (message_stack_depth > 0) {
            fprintf(stderr, ":\n");
            print_error_message(message_stack, message_stack_depth);
            pv_free_error_stack_func(message_stack);
        }
        exit(EXIT_FAILURE);
    }

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

    pv_octopus_matches_delete_func(matches);
    pv_close_dl(dl);

    return 0;
}

int main(int argc, char *argv[]) {

#if defined(_WIN32) || defined(_WIN64)

#define UTF8_COMPOSITION_FLAG (0)
#define NULL_TERMINATED       (-1)

    LPWSTR *wargv = CommandLineToArgvW(GetCommandLineW(), &argc);
    if (wargv == NULL) {
        fprintf(stderr, "CommandLineToArgvW failed\n");
        exit(EXIT_FAILURE);
    }

    char *utf8_argv[argc];

    for (int i = 0; i < argc; ++i) {
        // WideCharToMultiByte: https://docs.microsoft.com/en-us/windows/win32/api/stringapiset/nf-stringapiset-widechartomultibyte
        int arg_chars_num = WideCharToMultiByte(CP_UTF8, UTF8_COMPOSITION_FLAG, wargv[i], NULL_TERMINATED, NULL, 0, NULL, NULL);
        utf8_argv[i] = (char *) malloc(arg_chars_num * sizeof(char));
        if (!utf8_argv[i]) {
            fprintf(stderr, "Failed to to allocate memory for converting args");
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
