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
        {"library_path", required_argument, NULL, 'l'},
        {"model_path",   required_argument, NULL, 'm'},
        {"access_key",   required_argument, NULL, 'a'},
        {"audio_path",   required_argument, NULL, 'w'},
        {"index_path",   required_argument, NULL, 'i'},
};

static void print_usage(const char *program_name) {
    fprintf(
            stderr,
            "usage : %s -l LIBRARY_PATH -m MODEL_PATH -a ACCESS_KEY -w AUDIO_PATH -i INDEX_PATH\n",
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
                exit(EXIT_FAILURE);
        }
    }

    if (!library_path || !model_path || !audio_path || !access_key || !index_path) {
        print_usage(argv[0]);
        exit(EXIT_FAILURE);
    }

    void *dl = pv_open_dl(library_path);
    if (!dl) {
        fprintf(stderr, "Failed to open library.\n");
        exit(EXIT_FAILURE);
    }

    const char *(*pv_status_to_string_func)(pv_status_t) = pv_load_sym(dl, "pv_status_to_string");
    if (!pv_status_to_string_func) {
        print_dl_error("Failed to load 'pv_status_to_string'");
        exit(EXIT_FAILURE);
    }

    pv_status_t
    (*pv_octopus_init_func)(const char *, const char *, pv_octopus_t **) = pv_load_sym(dl, "pv_octopus_init");
    if (!pv_octopus_init_func) {
        print_dl_error("Failed to load 'pv_octopus_init()'.");
        exit(EXIT_FAILURE);
    }

    void (*pv_octopus_delete_func)(pv_octopus_t *) = pv_load_sym(dl, "pv_octopus_delete");
    if (!pv_octopus_delete_func) {
        print_dl_error("Failed to load 'pv_octopus_delete()'");
        exit(EXIT_FAILURE);
    }

    pv_status_t (*pv_octopus_index_file_size_func)(pv_octopus_t *, const char *, int32_t *) = NULL;
    pv_octopus_index_file_size_func = pv_load_sym(dl, "pv_octopus_index_file_size");
    if (!pv_octopus_index_file_size_func) {
        print_dl_error("Failed to load 'pv_octopus_index_file_size()'");
        exit(EXIT_FAILURE);
    }

    pv_status_t (*pv_octopus_index_file_func)(pv_octopus_t *, const char *, void *) = NULL;
    pv_octopus_index_file_func = pv_load_sym(dl, "pv_octopus_index_file");
    if (!pv_octopus_index_file_func) {
        print_dl_error("Failed to load 'pv_octopus_index_file()'");
        exit(EXIT_FAILURE);
    }

    const char (*pv_octopus_version_func)(const pv_octopus_t *) = pv_load_sym(dl, "pv_octopus_version");
    if (!pv_octopus_version_func) {
        print_dl_error("Failed to load 'pv_octopus_version()'");
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

    int32_t num_indices_byte = 0;
    status = pv_octopus_index_file_size_func(o, audio_path, &num_indices_byte);
    if (status != PV_STATUS_SUCCESS) {
        fprintf(stderr, "Failed to get index size with '%s'", pv_status_to_string_func(status));

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

    void *indices = calloc(num_indices_byte, sizeof(char));
    if (!indices) {
        fprintf(stderr, "Failed to allocate '%d' bytes of memory for Octopus indices.\n", num_indices_byte);
        exit(EXIT_FAILURE);
    }

    status = pv_octopus_index_file_func(o, audio_path, indices);
    if (status != PV_STATUS_SUCCESS) {
        fprintf(stderr, "Failed to index file with '%s'", pv_status_to_string_func(status));

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

    pv_octopus_delete_func(o);
    pv_close_dl(dl);

    FILE *f = fopen(index_path, "wb");
    if (!f) {
        fprintf(stderr, "Failed to create index file at '%s'.\n", index_path);
        exit(EXIT_FAILURE);
    }

    if (fwrite(indices, 1, num_indices_byte, f) != (size_t) num_indices_byte) {
        fprintf(stderr, "Failed to write into index file at '%s'.\n", index_path);
        exit(EXIT_FAILURE);
    }

    fclose(f);
    free(indices);

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
