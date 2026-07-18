#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <process.h>

int main(int argc, char *argv[]) {
    char **new_argv = malloc((argc + 10) * sizeof(char*));
    new_argv[0] = "x86_64-w64-mingw32-gcc.exe";
    
    int new_argc = 1;
    new_argv[new_argc++] = "-x";
    new_argv[new_argc++] = "assembler";
    new_argv[new_argc++] = "-c";

    for (int i = 1; i < argc; i++) {
        if (strcmp(argv[i], "--64") == 0) {
            new_argv[new_argc++] = "-m64";
        } else if (strcmp(argv[i], "--32") == 0) {
            new_argv[new_argc++] = "-m32";
        } else if (strcmp(argv[i], "--no-leading-underscore") == 0) {
            // ignore or pass to gcc if needed
        } else if (strcmp(argv[i], "-f") == 0) {
            // ignore
        } else {
            new_argv[new_argc++] = argv[i];
        }
    }
    
    new_argv[new_argc] = NULL;
    
    intptr_t ret = spawnvp(P_WAIT, "x86_64-w64-mingw32-gcc.exe", (char const *const *)new_argv);
    return (int)ret;
}
